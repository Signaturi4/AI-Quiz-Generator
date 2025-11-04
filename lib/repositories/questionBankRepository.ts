import { SupabaseClient } from "@supabase/supabase-js";

import {
  QuestionPool,
  QuestionPoolVersion,
  QuestionItem,
} from "../domain/models";
import { Database } from "../supabase/database.types";

type QuestionPoolInsert = Database["public"]["Tables"]["question_pools"]["Insert"];
type QuestionPoolVersionInsert =
  Database["public"]["Tables"]["question_pool_versions"]["Insert"];
type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];

type QuestionRecord = Database["public"]["Tables"]["questions"]["Row"];

type RandomQuestionResponse = QuestionRecord;

export class QuestionBankRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listQuestionPools(): Promise<QuestionPool[]> {
    const { data, error } = await this.client
      .from("question_pools")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data ?? []).map(QuestionPool.fromRecord);
  }

  async getQuestionPool(poolId: string): Promise<QuestionPool | null> {
    const { data, error } = await this.client
      .from("question_pools")
      .select("*")
      .eq("id", poolId)
      .maybeSingle();

    if (error) throw error;
    return data ? QuestionPool.fromRecord(data) : null;
  }

  async listPoolVersions(poolId: string): Promise<QuestionPoolVersion[]> {
    const { data, error } = await this.client
      .from("question_pool_versions")
      .select("*")
      .eq("pool_id", poolId)
      .order("version_number", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(QuestionPoolVersion.fromRecord);
  }

  async getPoolVersion(versionId: string): Promise<QuestionPoolVersion | null> {
    const { data, error } = await this.client
      .from("question_pool_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();

    if (error) throw error;
    return data ? QuestionPoolVersion.fromRecord(data) : null;
  }

  async listQuestions(versionId: string): Promise<QuestionItem[]> {
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .eq("pool_version_id", versionId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(QuestionItem.fromRecord);
  }

  async listAllQuestionsInPool(poolId: string): Promise<QuestionItem[]> {
    // First get all version IDs for this pool
    const versions = await this.listPoolVersions(poolId);
    const versionIds = versions.map((v) => v.id);

    if (versionIds.length === 0) {
      return [];
    }

    // Get all questions from all versions in this pool
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .in("pool_version_id", versionIds)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(QuestionItem.fromRecord);
  }

  async insertQuestionPool(pool: QuestionPool): Promise<QuestionPool> {
    const payload: QuestionPoolInsert = pool.toInsert();

    const { data, error } = await (this.client as any)
      .from("question_pools")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return QuestionPool.fromRecord(data);
  }

  async insertPoolVersion(
    version: QuestionPoolVersion
  ): Promise<QuestionPoolVersion> {
    const payload: QuestionPoolVersionInsert = version.toInsert();

    const { data, error } = await (this.client as any)
      .from("question_pool_versions")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return QuestionPoolVersion.fromRecord(data);
  }

  async updatePoolVersion(version: QuestionPoolVersion): Promise<QuestionPoolVersion> {
    const { data, error } = await (this.client as any)
      .from("question_pool_versions")
      .update(version.toUpdate())
      .eq("id", version.id)
      .select("*")
      .single();

    if (error) throw error;
    return QuestionPoolVersion.fromRecord(data);
  }

  async insertQuestion(question: QuestionItem): Promise<QuestionItem> {
    const payload: QuestionInsert = question.toInsert();

    const { data, error } = await (this.client as any)
      .from("questions")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return QuestionItem.fromRecord(data);
  }

  async getQuestion(questionId: string): Promise<QuestionItem | null> {
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();

    if (error) throw error;
    return data ? QuestionItem.fromRecord(data) : null;
  }

  async updateQuestion(question: QuestionItem): Promise<QuestionItem> {
    const updatePayload = question.toUpdate();
    
    console.log("[QuestionBankRepository] Updating question:", {
      id: question.id,
      payload: updatePayload,
    });
    
    const { data, error } = await (this.client as any)
      .from("questions")
      .update(updatePayload)
      .eq("id", question.id)
      .select("*")
      .single();

    if (error) {
      console.error("[QuestionBankRepository] Update error:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        questionId: question.id,
        payload: updatePayload,
      });
      throw error;
    }
    
    if (!data) {
      throw new Error(`Question ${question.id} not found after update`);
    }
    
    console.log("[QuestionBankRepository] Update successful:", {
      id: data.id,
      updated_at: data.updated_at,
    });
    
    return QuestionItem.fromRecord(data);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await this.client
      .from("questions")
      .delete()
      .eq("id", questionId);

    if (error) throw error;
  }

  async deleteVersion(versionId: string): Promise<void> {
    // Delete all questions in the version first (they should cascade, but doing it explicitly)
    const { error: questionsError } = await (this.client as any)
      .from("questions")
      .delete()
      .eq("pool_version_id", versionId);

    if (questionsError) {
      console.error("[QuestionBankRepository] Error deleting questions:", questionsError);
      throw questionsError;
    }

    // Delete the version
    const { error: versionError } = await (this.client as any)
      .from("question_pool_versions")
      .delete()
      .eq("id", versionId);

    if (versionError) {
      console.error("[QuestionBankRepository] Error deleting version:", versionError);
      throw versionError;
    }
  }

  async getLatestPublishedVersion(poolId: string): Promise<QuestionPoolVersion | null> {
    const { data, error } = await this.client
      .from("question_pool_versions")
      .select("*")
      .eq("pool_id", poolId)
      .eq("status", "published")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? QuestionPoolVersion.fromRecord(data) : null;
  }

  async getRandomQuestions(
    versionId: string,
    topic: string,
    limit: number
  ): Promise<QuestionItem[]> {
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .eq("pool_version_id", versionId)
      .eq("topic", topic)
      .order("random()")
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((record) => QuestionItem.fromRecord(record as RandomQuestionResponse));
  }
}

