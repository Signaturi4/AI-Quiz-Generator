import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { createSupabaseServerActionClient } from "../../../lib/supabase/server";
import { createQuestionBankService } from "../../../lib/services/questionBankService";
import { QuestionItem } from "../../../lib/domain/models";

const QUESTIONS_PER_ATTEMPT = 10;
const PASS_THRESHOLD = 0.7;
const RETAKE_INTERVAL_DAYS = 30;

export async function POST(request: NextRequest) {
  const client = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const certificationCode = body?.certificationCode;

  if (!certificationCode) {
    return new Response(JSON.stringify({ error: "Missing certification code" }), {
      status: 400,
    });
  }

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("id, role, category, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
    return new Response(JSON.stringify({ error: "Failed to load user" }), {
      status: 500,
    });
  }

  if (!profile) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }

  console.log(`[Quiz API] Looking for certification with code: ${certificationCode}`);
  
  const { data: certification, error: certificationError } = await client
    .from("certifications")
    .select("*")
    .eq("code", certificationCode)
    .maybeSingle();

  if (certificationError) {
    console.error("[Quiz API] Certification query error:", certificationError);
    return new Response(JSON.stringify({ error: "Failed to load certification" }), {
      status: 500,
    });
  }

  if (!certification) {
    console.error(`[Quiz API] Certification "${certificationCode}" not found in database`);
    return new Response(
      JSON.stringify({
        error: "Certification not found",
        details: `No certification with code "${certificationCode}" exists. Check admin panel.`,
      }),
      { status: 404 }
    );
  }

  console.log(`[Quiz API] Found certification:`, certification);
  console.log(`[Quiz API] Querying assignments for profile_id=${profile.id}, certification_id=${certification.id}`);

  // Use .order().limit(1) instead of .maybeSingle() to handle duplicates gracefully
  const { data: assignments, error: assignmentError } = await client
    .from("assignments")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("certification_id", certification.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const assignment = assignments?.[0] ?? null;

  if (assignmentError) {
    console.error("[Quiz API] Assignment query error:", assignmentError);
    return new Response(JSON.stringify({ error: "Failed to load assignment" }), {
      status: 500,
    });
  }

  if (!assignment) {
    console.error(
      `[Quiz API] No assignment found for user ${profile.id} (${profile.email}) and certification ${certification.code} (${certification.id})`
    );
    console.error(`[Quiz API] User category: ${profile.category}, role: ${profile.role}`);
    return new Response(
      JSON.stringify({
        error: "No quiz assignment found",
        details: `You need to visit /employee first to get assigned a quiz for ${certificationCode}`,
      }),
      { status: 403 }
    );
  }

  // Check if there's already a submitted attempt
  const { data: existingAttempt } = await client
    .from("attempts")
    .select("id, submitted_at, passed")
    .eq("assignment_id", assignment.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAttempt && existingAttempt.passed) {
    return new Response(
      JSON.stringify({
        error: "Already passed",
        details: "You have already passed this certification. No retake needed.",
      }),
      { status: 403 }
    );
  }

  if (assignment.next_eligible_at) {
    const nextEligible = new Date(assignment.next_eligible_at);
    if (nextEligible.getTime() > Date.now()) {
      return new Response(
        JSON.stringify({
          error: "Not eligible for retake",
          nextEligibleAt: assignment.next_eligible_at,
          details: "You must wait before retaking this assessment.",
        }),
        { status: 403 }
      );
    }
  }

  const service = createQuestionBankService(client);
  const poolVersion = await service.getLatestPublishedVersion(certification.question_pool_id);

  if (!poolVersion) {
    return new Response(JSON.stringify({ error: "No published version found" }), {
      status: 409,
    });
  }

  const topic = body?.topic ?? null;
  let questions: QuestionItem[];

  if (topic) {
    questions = await service.getRandomQuestions(
      poolVersion.id,
      topic,
      QUESTIONS_PER_ATTEMPT
    );
  } else {
    const { data: allQuestions, error: allQuestionsError } = await client
      .from("questions")
      .select("*")
      .eq("pool_version_id", poolVersion.id);

    if (allQuestionsError || !allQuestions) {
      return new Response(JSON.stringify({ error: "Failed to load questions" }), {
        status: 500,
      });
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    questions = shuffled
      .slice(0, QUESTIONS_PER_ATTEMPT)
      .map((record) => QuestionItem.fromRecord(record as any));
  }

  if (!questions || questions.length === 0) {
    return new Response(JSON.stringify({ error: "No questions available" }), {
      status: 409,
    });
  }

  const attemptInsert = {
    id: randomUUID(),
    assignment_id: assignment.id,
    certification_id: certification.id,
    pool_version_id: poolVersion.id,
    profile_id: profile.id,
    question_count: questions.length,
    correct_count: 0,
    responses: [],
  } as const;

  const { data: createdAttempt, error: attemptError } = await (client as any)
    .from("attempts")
    .insert(attemptInsert)
    .select("*")
    .single();

  if (attemptError) {
    console.error(attemptError);
    return new Response(JSON.stringify({ error: "Failed to create attempt" }), {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({
      attemptId: createdAttempt.id,
      durationMinutes: certification.duration_minutes || 30,
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        topic: question.topic,
        choices: question.choices,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        difficulty: question.difficulty,
        tags: question.tags,
      })),
    }),
    { status: 200 }
  );
}

export async function PUT(request: NextRequest) {
  const client = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const attemptId = body?.attemptId;
  const responses = body?.responses;

  if (!attemptId || !Array.isArray(responses)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
    });
  }

  const { data: attempt, error: attemptError } = await client
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    return new Response(JSON.stringify({ error: "Attempt not found" }), {
      status: 404,
    });
  }

  if (attempt.profile_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const { data: questions, error: questionError } = await client
    .from("questions")
    .select("id, answer_index")
    .eq("pool_version_id", attempt.pool_version_id);

  if (questionError || !questions) {
    return new Response(JSON.stringify({ error: "Failed to load questions" }), {
      status: 500,
    });
  }

  const answerMap = new Map(questions.map((question) => [question.id, question.answer_index]));

  let correctCount = 0;

  const evaluatedResponses = responses.map((response: any) => {
    const answerIndex = answerMap.get(response.questionId);
    const isCorrect = answerIndex === response.choiceIndex;

    if (isCorrect) {
      correctCount += 1;
    }

    return {
      question_id: response.questionId,
      choice_index: response.choiceIndex,
      correct: isCorrect,
    };
  });

  const score = correctCount / attempt.question_count;
  const passed = score >= PASS_THRESHOLD;

  const submittedAt = new Date().toISOString();
  const { error: updateError } = await (client as any)
    .from("attempts")
    .update({
      submitted_at: submittedAt,
      score,
      passed,
      correct_count: correctCount,
      responses: evaluatedResponses,
    })
    .eq("id", attempt.id);

  if (updateError) {
    console.error(updateError);
    return new Response(JSON.stringify({ error: "Failed to record attempt" }), {
      status: 500,
    });
  }

  const nextEligibleDate = new Date();
  nextEligibleDate.setDate(nextEligibleDate.getDate() + RETAKE_INTERVAL_DAYS);

  const { error: assignmentUpdateError } = await (client as any)
    .from("assignments")
    .update({
      status: passed ? "passed" : "failed",
      last_attempt_at: submittedAt,
      next_eligible_at: passed ? submittedAt : nextEligibleDate.toISOString(),
    })
    .eq("id", attempt.assignment_id);

  if (assignmentUpdateError) {
    console.error(assignmentUpdateError);
  }

  return new Response(
    JSON.stringify({
      score,
      passed,
      correctCount,
      questionCount: attempt.question_count,
    }),
    { status: 200 }
  );
}

