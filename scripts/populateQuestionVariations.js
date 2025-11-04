const {
  ensureQuestionPool,
  ensurePoolVersion,
  replaceQuestions,
  adminClient,
  SALES_QUESTIONS,
  HOSTESS_QUESTIONS,
  VARIATIONS_PER_CERTIFICATION,
  QUESTIONS_PER_VARIATION,
  normalizeQuestionForInsert,
} = require("./seedSupabase");

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildRandomizedVariations(baseQuestions) {
  if (!Array.isArray(baseQuestions) || baseQuestions.length === 0) {
    throw new Error("Question bank must contain at least one question");
  }

  const basePool = [...baseQuestions];
  const variations = [];
  let reservoir = shuffle(basePool);

  for (let variationIndex = 0; variationIndex < VARIATIONS_PER_CERTIFICATION; variationIndex += 1) {
    if (reservoir.length < QUESTIONS_PER_VARIATION) {
      reservoir = reservoir.concat(shuffle(basePool));
    }

    const selection = reservoir.splice(0, QUESTIONS_PER_VARIATION).map((question) =>
      normalizeQuestionForInsert(question)
    );
    variations.push(
      shuffle(selection).map((question) => ({
        ...question,
        choices: question.choices.map((choice) => ({ ...choice })),
      }))
    );
  }

  return variations;
}

async function populatePoolWithVariations(poolId, baseQuestions, label) {
  const variations = buildRandomizedVariations(baseQuestions);

  for (let index = 0; index < variations.length; index += 1) {
    const versionNumber = index + 1;
    const version = await ensurePoolVersion(poolId, versionNumber);

    await adminClient
      .from("question_pool_versions")
      .update({
        status: "published",
        notes: `${label} random variation #${versionNumber}`,
        published_at: version.published_at ?? new Date().toISOString(),
      })
      .eq("id", version.id);

    await replaceQuestions(version.id, variations[index]);
  }
}

async function main() {
  console.log("🔁 Populating certification question variations (randomized)...");

  const salesPool = await ensureQuestionPool(
    "Sales Certification Pool",
    "Question bank for Nuanu sales certification"
  );
  await populatePoolWithVariations(salesPool.id, SALES_QUESTIONS, "Sales");
  console.log("✔️ refreshed sales question variations");

  const hostessPool = await ensureQuestionPool(
    "Hostess Certification Pool",
    "Question bank for Nuanu hostess certification"
  );
  await populatePoolWithVariations(hostessPool.id, HOSTESS_QUESTIONS, "Hostess");
  console.log("✔️ refreshed hostess question variations");

  console.log("✅ Question variation population completed");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ Failed to populate question variations", err);
    process.exit(1);
  });
}

module.exports = {
  main,
  buildRandomizedVariations,
  populatePoolWithVariations,
};

