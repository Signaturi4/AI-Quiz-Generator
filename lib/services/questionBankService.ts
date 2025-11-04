import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

import {
  QuestionItem,
  QuestionPool,
  QuestionPoolVersion,
} from "../domain/models";
import { Database } from "../supabase/database.types";
import { QuestionBankRepository } from "../repositories/questionBankRepository";

interface CreatePoolInput {
  name: string;
  description?: string | null;
  initialVersionNumber?: number;
}

interface UpsertQuestionInput {
  id?: string;
  poolVersionId: string;
  topic: string;
  prompt: string;
  choices: { text: string }[];
  answerIndex: number;
  explanation?: string | null;
  difficulty?: string | null;
  tags?: string[] | null;
  orderIndex?: number | null;
}

export class QuestionBankService {
  private readonly repository: QuestionBankRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new QuestionBankRepository(client);
  }

  async listPools(): Promise<QuestionPool[]> {
    return this.repository.listQuestionPools();
  }

  async getLatestPublishedVersionSummary(poolId: string): Promise<{
    version: QuestionPoolVersion;
    questionCount: number;
    lastUpdated: string | null;
  } | null> {
    const version = await this.repository.getLatestPublishedVersion(poolId);
    if (!version) return null;

    const questions = await this.repository.listQuestions(version.id);
    const lastUpdated = questions.reduce<string | null>((acc, question) => {
      const updated = question.updatedAt ?? question.createdAt;
      if (!acc) return updated;
      return new Date(updated) > new Date(acc) ? updated : acc;
    }, version.publishedAt ?? version.createdAt);

    return {
      version,
      questionCount: questions.length,
      lastUpdated,
    };
  }

  async getPoolWithVersions(poolId: string): Promise<{
    pool: QuestionPool;
    versions: QuestionPoolVersion[];
  } | null> {
    const pool = await this.repository.getQuestionPool(poolId);
    if (!pool) return null;
    const versions = await this.repository.listPoolVersions(poolId);
    return { pool, versions };
  }

  async getVersionWithQuestions(versionId: string): Promise<{
    version: QuestionPoolVersion;
    questions: QuestionItem[];
  } | null> {
    const version = await this.repository.getPoolVersion(versionId);
    if (!version) return null;
    const questions = await this.repository.listQuestions(versionId);
    return { version, questions };
  }

  async createQuestionPool(input: CreatePoolInput): Promise<{
    pool: QuestionPool;
    version: QuestionPoolVersion;
  }> {
    const pool = QuestionPool.fromRecord({
      id: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const insertedPool = await this.repository.insertQuestionPool(pool);

    const versionNumber = input.initialVersionNumber ?? 1;
    const version = QuestionPoolVersion.fromRecord({
      id: randomUUID(),
      pool_id: insertedPool.id,
      version_number: versionNumber,
      status: "draft",
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      published_at: null,
    });

    const insertedVersion = await this.repository.insertPoolVersion(version);

    return { pool: insertedPool, version: insertedVersion };
  }

  async cloneVersion(versionId: string): Promise<QuestionPoolVersion> {
    const existing = await this.repository.getPoolVersion(versionId);
    if (!existing) {
      throw new Error("Version not found");
    }

    const versions = await this.repository.listPoolVersions(existing.poolId);
    const nextNumber = (versions[0]?.versionNumber ?? existing.versionNumber) + 1;

    const clone = QuestionPoolVersion.fromRecord({
      id: randomUUID(),
      pool_id: existing.poolId,
      version_number: nextNumber,
      status: "draft",
      notes: existing.notes,
      created_by: existing.createdBy,
      created_at: new Date().toISOString(),
      published_at: null,
    });

    const insertedClone = await this.repository.insertPoolVersion(clone);

    const questions = await this.repository.listQuestions(versionId);
    await Promise.all(
      questions.map((question, index) =>
        this.repository.insertQuestion(
          QuestionItem.fromRecord({
            id: randomUUID(),
            pool_version_id: insertedClone.id,
            topic: question.topic,
            prompt: question.prompt,
            choices: question.choices,
            answer_index: question.answerIndex,
            explanation: question.explanation,
            difficulty: question.difficulty,
            tags: question.tags,
            order_index: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        )
      )
    );

    return insertedClone;
  }

  async upsertQuestion(input: UpsertQuestionInput): Promise<QuestionItem> {
    const baseRecord = {
      id: input.id ?? randomUUID(),
      pool_version_id: input.poolVersionId,
      topic: input.topic,
      prompt: input.prompt,
      choices: input.choices,
      answer_index: input.answerIndex,
      explanation: input.explanation ?? null,
      difficulty: input.difficulty ?? null,
      tags: input.tags ?? null,
      order_index: input.orderIndex ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const model = QuestionItem.fromRecord(baseRecord);

    if (input.id) {
      return this.repository.updateQuestion(model);
    }
    return this.repository.insertQuestion(model);
  }

  async publishVersion(versionId: string): Promise<QuestionPoolVersion> {
    const version = await this.repository.getPoolVersion(versionId);
    if (!version) throw new Error("Version not found");

    version.markPublished();
    return this.repository.updatePoolVersion(version);
  }

  async getLatestPublishedVersion(poolId: string) {
    return this.repository.getLatestPublishedVersion(poolId);
  }

  async deleteQuestion(questionId: string) {
    return this.repository.deleteQuestion(questionId);
  }

  async getRandomQuestions(versionId: string, topic: string, limit: number) {
    return this.repository.getRandomQuestions(versionId, topic, limit);
  }
}

export function createQuestionBankService(client: SupabaseClient<Database>) {
  return new QuestionBankService(client);
}

