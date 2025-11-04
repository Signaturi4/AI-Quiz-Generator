import {
  AssignmentRecord,
  AttemptRecord,
  CertificationRecord,
  QuestionPoolRecord,
  QuestionPoolVersionRecord,
  QuestionRecord,
  Tables,
  UserRecord,
} from "../supabase/database.types";

type Insert<T extends keyof Tables> = Tables[T]["Insert"];
type Update<T extends keyof Tables> = Tables[T]["Update"];

export class QuestionPool {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  static fromRecord(record: QuestionPoolRecord): QuestionPool {
    return new QuestionPool(
      record.id,
      record.name,
      record.description,
      record.created_at,
      record.updated_at
    );
  }

  toInsert(): Insert<"question_pools"> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
    };
  }

  toUpdate(): Update<"question_pools"> {
    return {
      name: this.name,
      description: this.description,
      updated_at: new Date().toISOString(),
    };
  }
}

export class User {
  constructor(
    public readonly id: string,
    public email: string | null,
    public firstName: string | null,
    public lastName: string | null,
    public role: string,
    public category: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  static fromRecord(record: UserRecord): User {
    return new User(
      record.id,
      record.email,
      record.first_name,
      record.last_name,
      record.role,
      record.category,
      record.created_at,
      record.updated_at
    );
  }

  toInsert(): Insert<"users"> {
    return {
      id: this.id,
      email: this.email || "",
      first_name: this.firstName ?? undefined,
      last_name: this.lastName ?? undefined,
      role: this.role,
      category: this.category ?? undefined,
    };
  }

  toUpdate(): Update<"users"> {
    return {
      email: this.email ?? undefined,
      first_name: this.firstName ?? undefined,
      last_name: this.lastName ?? undefined,
      role: this.role,
      category: this.category ?? undefined,
      updated_at: new Date().toISOString(),
    };
  }
}

export class QuestionPoolVersion {
  constructor(
    public readonly id: string,
    public readonly poolId: string,
    public versionNumber: number,
    public status: string,
    public notes: string | null,
    public readonly createdBy: string | null,
    public readonly createdAt: string,
    public readonly publishedAt: string | null
  ) {}

  static fromRecord(record: QuestionPoolVersionRecord): QuestionPoolVersion {
    return new QuestionPoolVersion(
      record.id,
      record.pool_id,
      record.version_number,
      record.status,
      record.notes,
      record.created_by,
      record.created_at,
      record.published_at
    );
  }

  toInsert(): Insert<"question_pool_versions"> {
    return {
      id: this.id,
      pool_id: this.poolId,
      version_number: this.versionNumber,
      status: this.status as any,
      notes: this.notes,
      created_by: this.createdBy ?? undefined,
      published_at: this.publishedAt ?? undefined,
    };
  }

  markPublished(timestamp: string = new Date().toISOString()) {
    this.status = "published";
    (this as { publishedAt: string | null }).publishedAt = timestamp;
  }

  toUpdate(): Update<"question_pool_versions"> {
    return {
      status: this.status as any,
      notes: this.notes,
      published_at: this.publishedAt ?? undefined,
    };
  }
}

export interface QuestionChoice {
  text: string;
}

const parseChoices = (rawChoices: unknown): QuestionChoice[] => {
  if (!Array.isArray(rawChoices)) {
    return [];
  }

  return rawChoices.map((choice) => {
    if (typeof choice === "string") {
      return { text: choice };
    }
    if (choice && typeof choice === "object") {
      const value = (choice as { text?: unknown }).text;
      if (typeof value === "string") {
        return { text: value };
      }
      if (value !== undefined) {
        return { text: String(value) };
      }
    }
    return { text: String(choice ?? "") };
  });
};

export class QuestionItem {
  constructor(
    public readonly id: string,
    public readonly poolVersionId: string,
    public topic: string,
    public prompt: string,
    public choices: QuestionChoice[],
    public answerIndex: number,
    public explanation: string | null,
    public difficulty: string | null,
    public tags: string[] | null,
    public orderIndex: number | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  static fromRecord(record: QuestionRecord): QuestionItem {
    return new QuestionItem(
      record.id,
      record.pool_version_id,
      record.topic,
      record.prompt,
      parseChoices(record.choices),
      record.answer_index,
      record.explanation,
      record.difficulty,
      record.tags,
      record.order_index,
      record.created_at,
      record.updated_at
    );
  }

  toInsert(): Insert<"questions"> {
    return {
      id: this.id,
      pool_version_id: this.poolVersionId,
      topic: this.topic,
      prompt: this.prompt,
      choices: this.choices,
      answer_index: this.answerIndex,
      explanation: this.explanation,
      difficulty: this.difficulty ?? undefined,
      tags: this.tags ?? undefined,
      order_index: this.orderIndex ?? undefined,
    };
  }

  toUpdate(): Update<"questions"> {
    return {
      topic: this.topic,
      prompt: this.prompt,
      choices: this.choices,
      answer_index: this.answerIndex,
      explanation: this.explanation,
      difficulty: this.difficulty ?? undefined,
      tags: this.tags ?? undefined,
      order_index: this.orderIndex ?? undefined,
      updated_at: new Date().toISOString(),
    };
  }
}

export class Certification {
  constructor(
    public readonly id: string,
    public code: string,
    public title: string,
    public description: string | null,
    public questionPoolId: string,
    public active: boolean,
    public durationMinutes: number | null,
    public passingThreshold: number,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  static fromRecord(record: CertificationRecord): Certification {
    return new Certification(
      record.id,
      record.code,
      record.title,
      record.description,
      record.question_pool_id,
      record.active,
      record.duration_minutes,
      record.passing_threshold,
      record.created_at,
      record.updated_at
    );
  }

  toInsert(): Insert<"certifications"> {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      description: this.description,
      question_pool_id: this.questionPoolId,
      active: this.active,
      duration_minutes: this.durationMinutes ?? undefined,
      passing_threshold: this.passingThreshold,
    };
  }

  toUpdate(): Update<"certifications"> {
    return {
      code: this.code,
      title: this.title,
      description: this.description,
      question_pool_id: this.questionPoolId,
      active: this.active,
      duration_minutes: this.durationMinutes ?? undefined,
      passing_threshold: this.passingThreshold,
      updated_at: new Date().toISOString(),
    };
  }
}

export class Assignment {
  constructor(
    public readonly id: string,
    public readonly profileId: string,
    public readonly certificationId: string,
    public status: string,
    public assignedAt: string,
    public dueAt: string | null,
    public lastAttemptAt: string | null,
    public nextEligibleAt: string | null,
    public notes: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  static fromRecord(record: AssignmentRecord): Assignment {
    return new Assignment(
      record.id,
      record.profile_id,
      record.certification_id,
      record.status,
      record.assigned_at,
      record.due_at,
      record.last_attempt_at,
      record.next_eligible_at,
      record.notes,
      record.created_at,
      record.updated_at
    );
  }

  toInsert(): Insert<"assignments"> {
    return {
      id: this.id,
      profile_id: this.profileId,
      certification_id: this.certificationId,
      status: this.status as any,
      assigned_at: this.assignedAt,
      due_at: this.dueAt ?? undefined,
      last_attempt_at: this.lastAttemptAt ?? undefined,
      next_eligible_at: this.nextEligibleAt ?? undefined,
      notes: this.notes ?? undefined,
    };
  }

  toUpdate(): Update<"assignments"> {
    return {
      status: this.status as any,
      assigned_at: this.assignedAt,
      due_at: this.dueAt ?? undefined,
      last_attempt_at: this.lastAttemptAt ?? undefined,
      next_eligible_at: this.nextEligibleAt ?? undefined,
      notes: this.notes ?? undefined,
      updated_at: new Date().toISOString(),
    };
  }
}

export interface AttemptResponse {
  question_id: string;
  choice_index: number;
  correct: boolean;
}

export class Attempt {
  constructor(
    public readonly id: string,
    public readonly assignmentId: string,
    public readonly certificationId: string,
    public readonly poolVersionId: string,
    public readonly profileId: string,
    public startedAt: string,
    public submittedAt: string | null,
    public score: number | null,
    public passed: boolean | null,
    public questionCount: number,
    public correctCount: number,
    public responses: AttemptResponse[],
    public readonly createdAt: string
  ) {}

  static fromRecord(record: AttemptRecord): Attempt {
    return new Attempt(
      record.id,
      record.assignment_id,
      record.certification_id,
      record.pool_version_id,
      record.profile_id,
      record.started_at,
      record.submitted_at,
      record.score,
      record.passed,
      record.question_count,
      record.correct_count,
      (record.responses as AttemptResponse[]) ?? [],
      record.created_at
    );
  }

  toInsert(): Insert<"attempts"> {
    return {
      id: this.id,
      assignment_id: this.assignmentId,
      certification_id: this.certificationId,
      pool_version_id: this.poolVersionId,
      profile_id: this.profileId,
      started_at: this.startedAt,
      submitted_at: this.submittedAt ?? undefined,
      score: this.score ?? undefined,
      passed: this.passed ?? undefined,
      question_count: this.questionCount,
      correct_count: this.correctCount,
      responses: this.responses,
    };
  }

  toUpdate(): Update<"attempts"> {
    return {
      started_at: this.startedAt,
      submitted_at: this.submittedAt ?? undefined,
      score: this.score ?? undefined,
      passed: this.passed ?? undefined,
      question_count: this.questionCount,
      correct_count: this.correctCount,
      responses: this.responses,
    };
  }
}

