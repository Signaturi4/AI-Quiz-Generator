-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.article_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_presets_pkey PRIMARY KEY (id),
  CONSTRAINT article_presets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.article_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_topics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  preset_id uuid,
  title text NOT NULL,
  url_title text UNIQUE,
  description text,
  content text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'pending'::text, 'failed'::text])),
  scope text DEFAULT 'private'::text CHECK (scope = ANY (ARRAY['private'::text, 'public'::text])),
  topic text,
  preview jsonb,
  visual_description text,
  locale text DEFAULT 'en'::text,
  likes integer DEFAULT 0,
  views integer DEFAULT 0,
  keywords ARRAY,
  authors ARRAY,
  usage jsonb,
  word_count integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT articles_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.article_presets(id)
);
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL,
  certification_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  due_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  next_eligible_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications(id),
  CONSTRAINT assignments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.users(id)
);
CREATE TABLE public.assistants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  prompt text,
  model text,
  environment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assistants_pkey PRIMARY KEY (id),
  CONSTRAINT assistants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL,
  certification_id uuid NOT NULL,
  pool_version_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone,
  score numeric,
  passed boolean,
  question_count integer NOT NULL,
  correct_count integer NOT NULL,
  responses jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT attempts_pkey PRIMARY KEY (id),
  CONSTRAINT attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT attempts_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES public.certifications(id),
  CONSTRAINT attempts_pool_version_id_fkey FOREIGN KEY (pool_version_id) REFERENCES public.question_pool_versions(id)
);
CREATE TABLE public.authors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  job_title text,
  type text CHECK (type = ANY (ARRAY['Person'::text, 'Organization'::text])),
  social_media jsonb,
  image text,
  suspended boolean DEFAULT false,
  rating numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT authors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.billing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id text NOT NULL UNIQUE,
  status text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
  features jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT billing_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  question_pool_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  duration_minutes integer,
  passing_threshold numeric NOT NULL DEFAULT 0.700,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT certifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_email text,
  title text NOT NULL,
  children jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted boolean DEFAULT false,
  system text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT folders_pkey PRIMARY KEY (id),
  CONSTRAINT folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.invitation_codes (
  code text NOT NULL,
  role text NOT NULL DEFAULT 'employee'::text,
  category text,
  notes text,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  used_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invitation_codes_pkey PRIMARY KEY (code)
);
CREATE TABLE public.keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  search_volume integer,
  difficulty_score numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT keywords_pkey PRIMARY KEY (id)
);
CREATE TABLE public.knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  urls jsonb DEFAULT '[]'::jsonb,
  content jsonb DEFAULT '[]'::jsonb,
  deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_base_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_base_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.publishing_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  platform text NOT NULL,
  credentials jsonb,
  settings jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT publishing_configs_pkey PRIMARY KEY (id),
  CONSTRAINT publishing_configs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.question_pool_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pool_id uuid NOT NULL,
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  CONSTRAINT question_pool_versions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.question_pools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  test_duration_minutes integer DEFAULT 30,
  CONSTRAINT question_pools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pool_version_id uuid NOT NULL,
  topic text NOT NULL,
  prompt text NOT NULL,
  choices jsonb NOT NULL,
  answer_index smallint NOT NULL,
  explanation text,
  difficulty text,
  tags ARRAY,
  order_index integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_pool_version_id_fkey FOREIGN KEY (pool_version_id) REFERENCES public.question_pool_versions(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  plan_id text,
  status text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'canceled'::text])),
  subscription_id text UNIQUE,
  source text CHECK (source = ANY (ARRAY['paypal'::text, 'stripe'::text])),
  valid_date timestamp with time zone,
  final_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(plan_id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  phone_number text,
  phone_verified boolean DEFAULT false,
  last_ip inet,
  last_login timestamp with time zone,
  logins_count integer DEFAULT 0,
  blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role text,
  category text,
  display_name text,
  first_name text,
  last_name text,
  assigned_pool_version_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_assigned_pool_version_id_fkey FOREIGN KEY (assigned_pool_version_id) REFERENCES public.question_pool_versions(id)
);

---

## Authentication Issue: Users Seeing Other Accounts' Data

### Problem
When logging in with a new account, users were seeing data from other accounts instead of their own unique page with their tests and certifications.

### Root Causes
1. **Session Caching**: Browser and server-side caching causing stale session data
2. **Cookie Persistence**: Authentication cookies not being properly cleared between logins
3. **Insufficient Cache Control**: Page not forcing fresh data fetches

### Solution Implemented

#### 1. Enhanced Cache Control (employee/page.tsx)
```typescript
export const dynamic = "force-dynamic";  // Disable static generation
export const revalidate = 0;             // Never cache
export const fetchCache = "force-no-store"; // Force fresh fetches
```

#### 2. Improved Sign-Out (SignOutButton.jsx)
- Added `router.refresh()` to clear client-side cache
- Added redirect to `/corp/redirect` after sign-out
- Ensures clean session termination

#### 3. Added Debug Logging
- Console logs show authenticated user ID and email
- Helps verify correct user is authenticated

### Data Isolation Verification
The employee page correctly filters data by `userId`:
- **Profile**: `.eq("id", userId)` (line 99)
- **Assignments**: `.eq("profile_id", userId)` (line 123)
- **Attempts**: `.eq("profile_id", userId)` (line 354)

### Testing Checklist
1. Sign out completely from one account
2. Clear browser cache (Ctrl+Shift+Del)
3. Sign in with different account
4. Check console logs for correct user ID
5. Verify you see only your assignments/attempts

### Additional Recommendations
1. **Always sign out** before switching accounts
2. **Use incognito/private mode** when testing multiple accounts
3. **Check server logs** for "[Employee Page]" messages to verify user ID
4. **Verify user exists** in `users` table with correct `role` and `category`

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
