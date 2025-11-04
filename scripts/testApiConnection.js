#!/usr/bin/env node

/**
 * Quick health-check script for the quiz API.
 *
 * Usage:
 *   # ensure the Next.js server is running (npm run dev or npm run start)
 *   node scripts/testApiConnection.js
 *
 * The script sends a sample quiz generation request, validates the response
 * shape, logs the result, and exits with a non-zero status on failure.
 */

const BASE_URL = process.env.QUIZ_BASE_URL ?? "http://localhost:3000";

const SAMPLE_REQUEST = {
  language: "javascript",
  difficulty: "beginner",
  topic: "closures",
  numQuestions: 3,
};

async function consumeStream(response) {
  if (!response.body) {
    throw new Error("Response body is empty; is the API reachable?");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
  }

  // flush any remaining buffered content
  accumulated += decoder.decode();

  return accumulated;
}

function sanitizePayload(rawStream) {
  if (!rawStream) {
    throw new Error("Empty payload received from API");
  }

  const compact = rawStream.replace(/\n/g, "");

  try {
    return JSON.parse(compact);
  } catch (error) {
    throw new Error(`Failed to parse API response as JSON: ${error.message}`);
  }
}

function validateQuizPayload(payload) {
  if (!payload || !Array.isArray(payload.questions)) {
    throw new Error('API response missing "questions" array');
  }

  if (payload.questions.length === 0) {
    throw new Error("API returned zero questions");
  }

  const sample = payload.questions[0];
  const hasStructure =
    sample &&
    typeof sample.query === "string" &&
    Array.isArray(sample.choices) &&
    typeof sample.answer !== "undefined" &&
    typeof sample.explanation === "string";

  if (!hasStructure) {
    throw new Error("API response does not match expected quiz schema");
  }
}

async function main() {
  const endpoint = `${BASE_URL.replace(/\/$/, "")}/api/chat`;

  console.log(`→ Testing quiz API at ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(SAMPLE_REQUEST),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API request failed with status ${response.status}: ${text}`
    );
  }

  const raw = await consumeStream(response);
  console.log("--- Raw OpenAI response ---");
  console.log(raw);

  const payload = sanitizePayload(raw);
  console.log("--- Parsed JSON payload ---");
  console.log(JSON.stringify(payload, null, 2));

  validateQuizPayload(payload);

  console.log(
    `✅ API responded with ${payload.questions.length} questions (sample: "${payload.questions[0].query}")`
  );
  console.log("Cleaning up… (no persisted data to remove)");
}

main()
  .then(() => {
    console.log("✅ Quiz API health-check completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Quiz API health-check failed");
    console.error(error);
    process.exit(1);
  });
