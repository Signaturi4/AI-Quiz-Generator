import { createSupabaseServerComponentClient } from "../supabase/server";
import { QuestionBankService } from "../services/questionBankService";

const serviceCache = new Map<string, QuestionBankService>();

export function getServerQuestionBankService() {
  const client = createSupabaseServerComponentClient();
  const cacheKey = "questionBankService";

  if (!serviceCache.has(cacheKey)) {
    serviceCache.set(cacheKey, new QuestionBankService(client));
  }

  const service = serviceCache.get(cacheKey)!;
  return { client, service };
}

