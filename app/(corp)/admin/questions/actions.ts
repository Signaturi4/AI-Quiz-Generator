"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerActionClient } from "../../../../lib/supabase/server";
import { createQuestionBankService } from "../../../../lib/services/questionBankService";

async function requireAdmin(
  client: ReturnType<typeof createSupabaseServerActionClient>
) {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, profile };
}

export async function upsertQuestionAction(formData: FormData) {
  const poolId = formData.get("poolId")?.toString();
  const versionId = formData.get("versionId")?.toString();

  if (!poolId || !versionId) {
    throw new Error("Missing pool or version identifier");
  }

  const topic = formData.get("topic")?.toString() ?? "";
  const prompt = formData.get("prompt")?.toString() ?? "";
  const explanationRaw = formData.get("explanation")?.toString() ?? "";
  const difficultyRaw = formData.get("difficulty")?.toString() ?? "";
  const explanation = explanationRaw.trim() === "" ? null : explanationRaw;
  const difficulty = difficultyRaw.trim() === "" ? null : difficultyRaw;
  const orderIndexValue = formData.get("orderIndex")?.toString();
  const orderIndex = orderIndexValue ? Number(orderIndexValue) : null;
  const answerIndex = Number(formData.get("answerIndex") ?? 0);

  const choicesRaw = formData.get("choices")?.toString() ?? "[]";
  let parsedChoices: { text: string }[] = [];
  try {
    const arr = JSON.parse(choicesRaw);
    if (Array.isArray(arr)) {
      parsedChoices = arr
        .map((entry) => {
          const text = typeof entry === "string" ? entry : entry?.text;
          return text ? { text: text as string } : null;
        })
        .filter(Boolean) as { text: string }[];
    }
  } catch (err) {
    console.error("Invalid choices payload", err);
  }

  if (parsedChoices.length === 0) {
    throw new Error("At least one choice is required");
  }

  if (answerIndex < 0 || answerIndex >= parsedChoices.length) {
    throw new Error("Answer index is out of range");
  }

  const tagsRaw = formData.get("tags")?.toString()?.trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : null;

  const questionId = formData.get("questionId")?.toString() || undefined;

  const client = createSupabaseServerActionClient();
  await requireAdmin(client);

  const service = createQuestionBankService(client);
  await service.upsertQuestion({
    id: questionId,
    poolVersionId: versionId,
    topic,
    prompt,
    choices: parsedChoices,
    answerIndex,
    explanation,
    difficulty,
    tags,
    orderIndex,
  });

  revalidatePath(`/admin/questions/${poolId}`);
}

export async function deleteQuestionAction(formData: FormData) {
  const poolId = formData.get("poolId")?.toString();
  const questionId = formData.get("questionId")?.toString();

  if (!poolId || !questionId) {
    throw new Error("Missing identifiers");
  }

  const client = createSupabaseServerActionClient();
  await requireAdmin(client);
  const service = createQuestionBankService(client);

  await service.deleteQuestion(questionId);
  revalidatePath(`/admin/questions/${poolId}`);
}

export async function createDraftVersionAction(formData: FormData) {
  const poolId = formData.get("poolId")?.toString();
  const sourceVersionId = formData.get("sourceVersionId")?.toString();

  if (!poolId || !sourceVersionId) {
    throw new Error("Missing identifiers");
  }

  const client = createSupabaseServerActionClient();
  await requireAdmin(client);

  const service = createQuestionBankService(client);
  await service.cloneVersion(sourceVersionId);
  revalidatePath(`/admin/questions/${poolId}`);
}

export async function publishVersionAction(formData: FormData) {
  const poolId = formData.get("poolId")?.toString();
  const versionId = formData.get("versionId")?.toString();

  if (!poolId || !versionId) {
    throw new Error("Missing identifiers");
  }

  const client = createSupabaseServerActionClient();
  await requireAdmin(client);

  const service = createQuestionBankService(client);
  await service.publishVersion(versionId);
  revalidatePath(`/admin/questions/${poolId}`);
}

export async function deleteVersionAction(formData: FormData) {
  const poolId = formData.get("poolId")?.toString();
  const versionId = formData.get("versionId")?.toString();

  if (!poolId || !versionId) {
    throw new Error("Missing identifiers");
  }

  const client = createSupabaseServerActionClient();
  await requireAdmin(client);

  const service = createQuestionBankService(client);

  try {
    await service.deleteVersion(versionId);
    console.log("[deleteVersionAction] Success:", versionId);
  } catch (error) {
    console.error("[deleteVersionAction] Error:", error);
    throw error;
  }

  revalidatePath(`/admin/questions/${poolId}`);
}
