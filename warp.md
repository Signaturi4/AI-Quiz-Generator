# Warp Guide

## Project Snapshot

- **App**: AI Quiz Generator built with the Next.js App Router (`app/` directory)
- **Purpose**: Generate multiple-choice quizzes on demand via OpenAI Chat Completions
- **Key Modules**: UI pages in `app/`, constants in `app/constants/`, OpenAI streaming handler in `app/utils/OpenAIStream.js`
- **Data Flow**: Client selects quiz config → `/quiz` fetches `/api/chat` → OpenAI streams JSON quiz → Questions rendered and scored → `/end-screen` summarises results with gifs/messages

## Tech Stack

- **Framework**: Next.js 13.4.1 (App Router) running on Node.js 18+ with Edge Route support
- **Language**: React 18 client components with JSX; optional TypeScript config present (`tsconfig.json`)
- **Styling**: Tailwind CSS 3.3 with custom utility classes in `app/globals.css`
- **Animation & UX**: Framer Motion for progress bar, `react-simple-typewriter` for text effects, `react-use`, `react-confetti`, `react-icons`
- **AI Integration**: OpenAI Chat Completions API (`gpt-5-mini` model) consumed via streaming helper `OpenAIStream`
- **Tooling**: ESLint (`eslint-config-next`), PostCSS, Autoprefixer; npm scripts `dev`, `build`, `start`, `lint`

## Environment & Secrets

- Required variable: `OPENAI_API_KEY` for authenticated requests to OpenAI
- Store secrets in `.env.local` (Next.js default) or `.env`; see `env.example` template in repo
- Never commit actual keys; `.gitignore` already excludes `.env`

## Setup Checklist

- Install dependencies: `npm install`
- Copy environment template: `cp .env .env.local` (or manually export `OPENAI_API_KEY`)
- Run locally: `npm run dev` (default at http://localhost:3000)
- Lint before shipping: `npm run lint`

## Data & Configuration

- Quiz topics: `app/constants/topics.js`; arrays keyed by language; include `'Random'` as first entry for dynamic prompts
- Sample quiz data: `app/constants/testQuiz.js` used for fallback/manual testing
- End screen messaging: `app/constants/endMessages.js` grouped by `perfect | good | bad`
- Celebration gifs: `app/constants/gifs.js`; supply Giphy embed URLs grouped by score tier
- Fun facts (unused in core flow but available): `app/constants/facts.js`
- **Persistent storage:** Supabase database (see “Supabase Architecture”)

## Supabase Architecture

- Schema lives in `supabase/schema.sql`; run the statements against your Supabase project to provision:
  - `profiles` (role + category: `admin`, `sales`, `hostess`)
  - `question_pools` and immutable `question_pool_versions`
  - `questions` (JSON choices, explanation, difficulty, tags)
  - `certifications` (links to pools, threshold, duration)
  - `assignments` (tracks employee certification schedule and retake window)
  - `attempts` (captures quiz submissions, scores, question-level responses)
- Domain models + typed helpers live in `lib/domain/models.ts` and `lib/supabase/database.types.ts`
- Server/client Supabase helpers: `lib/supabase/server.ts` + `app/providers/SupabaseProvider.jsx`

## Seeding & Mock Data

- Ensure `.env.local` contains:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Seed baseline data (admin account, sales/hostess employees, question pools, certifications, assignments):

```bash
npm run supabase:seed
```

- Admin user: `admin@nuanu.dev`
- Sales employee: `sales.agent@nuanu.dev`
- Hostess employee: `hostess@nuanu.dev`
- Generates two question pools (Sales, Hostess) with published v1 and attaches assignments to each employee
- Quiz runtime selects 10 random questions per topic from the latest published `question_pool_versions`

## Behaviour Overview

- **Home (`app/page.jsx`)**: Collects `language`, `difficulty`, `topic`, `numQuestions`; forwards to `/quiz`
- **Quiz (`app/quiz/page.jsx`)**: Initiates POST to `/api/chat`; handles streaming, progressive rendering, scoring, highlight.js syntax styling
- **Question component**: Manages answer selection, submission, explains correct responses, updates progress counters
- **End Screen (`app/end-screen/page.jsx`)**: Calculates grade, shows dynamic message/gif, optional speech/Confetti based on performance

## API & Stream Handling

- **Endpoint**: `app/api/chat/route.js` (Edge runtime)
  - Validates `OPENAI_API_KEY`
  - Builds natural-language prompt from user selections
  - Streams completion via `OpenAIStream`
  - Expects JSON payload: `{ questions: [{ query, choices[], answer, explanation }] }`
- **Streaming Utility**: `app/utils/OpenAIStream.js`
  - Wraps OpenAI SSE stream, pipes incremental tokens to Next.js response
  - Requires `eventsource-parser`

## Modifying Data & Behaviour

- **New Topics/Domains**: Extend `topics` map; ensure lowercase keys match `language` URL query values
- **Difficulty/Question Count Defaults**: Adjust state initialisers in `app/page.jsx`
- **Prompt Tuning**: Edit `prompt` string in `/api/chat/route.js` (adjust `temperature`, `model`, instructions)
- **Answer Validation Rules**: Update `Question.jsx` logic if switching to non-index answers; maintain `answer` as number for current UI
- **Scoring Thresholds**: Modify grade calculation in `end-screen/page.jsx`
- **Accessibility**: Add ARIA roles/keyboard handling in `Question.jsx` for improved usability

## Testing Strategy

- Manual mock: swap API call for `testQuiz` in `/quiz` page when API quota is limited
- Suggested automation: add Vitest/React Testing Library for component logic; integrate Playwright for end-to-end flows
- Use `npm run lint` to enforce coding standards

## Deployment Notes

- **Preferred Host**: Vercel (Edge runtime supported); also compatible with Netlify Edge or self-hosted Node
- **Build Command**: `npm run build`; Output static assets + serverless functions
- **Environment Setup**:
  - Add `OPENAI_API_KEY` in hosting provider dashboard
  - Enable Edge runtime for `/api/chat`
- **Monitoring**: Track OpenAI usage quotas; handle rate limit errors with retries/backoff (not yet implemented)

## Operational Runbook

- Rotate API keys if compromised; update `.env.local`
- To troubleshoot streaming: log chunks inside `OpenAIStream` (commented snippets included)
- Validate JSON parsing errors by logging `responseText` before `JSON.parse`
- Maintain alignment between UI options and prompt grammar (keep lowercase in queries for API, human-readable in UI)

## Future Enhancements

- Add caching for repeated quiz requests to reduce token usage
- Persist quiz attempts in database (e.g., Supabase, MongoDB) for analytics
- Introduce authentication for personalised history
- Provide multi-language UI/voice (text-to-speech already scaffolded with `react-use`)
- Implement graceful fallback when OpenAI API fails (display helpful message, reuse last quiz)
