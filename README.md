# AI Quiz Generator

Uses OpenAI's ChatGPT API to generate multiple choice quiz with user defined language, topic, and difficulty.

Features a loading screen with random facts to give the user something to do while the data is retrieved from the API and an ending screen with score-determined gifs and sarcastic messages.

[View Live App](https://ai-quiz-generator-next.vercel.app/)

![home page](./docs/images/home-page.jpg)

## Features

- Customisable language, topic, difficulty, and number of questions
- Loading screen that displays the live response stream and random webdev/programming facts (gives you something to do as it can take around 20-30 seconds for the quiz to generate)
- Multiple choice Ed-style quiz with explanations and a progress bar
- End screen with gifs, sarcastic messages, and confetti (>= 80%) that adapt to your quiz score
- 14 track kahoot-flavored audio player (this is the real highlight, the quiz is just something to do while you're groovin 😁)

## Tech Used

- Next.js 13.4 (using the new App router)
- Tailwind CSS
- OpenAI's `gpt-3-turbo` API

## Packages Used

- [framer-motion](https://www.framer.com/motion/) (for animations)
- [highlight.js](https://www.npmjs.com/package/highlight.js) (for syntax highlighting)
- [react-confetti](https://www.npmjs.com/package/react-confetti)
- [react-loader-spinner](https://www.npmjs.com/package/react-loader-spinner)
- [react-icons](https://react-icons.github.io/react-icons/)
- [react-use](https://github.com/streamich/react-use) (for the `useAudio()` hook)
- [react-simple-typewriter](https://www.npmjs.com/package/react-simple-typewriter)

## Tools

- `create-next-app` (development and building)
- Vercel (deployment)

## OpenAI Integration

A custom prompt is created by interpolating user entered form data. Crucially, the response is asked to be returned in JSON format. Light "prompt engineering" was required to ensure the response was consistently in the correct format (for example: explicitly saying what the names of the keys should be).

![prompt](./docs/images/prompt.jpg)

The API is queried. After playing with the available parameters, I found leaving most of them at their default setting worked well.

![api request](./docs/images/api-request.jpg)

## Screenshots

![loading screen](./docs/images/loading-screen.jpg)

![quiz screen](./docs/images/quiz-screen.jpg)

![end-screen](./docs/images/end-screen.jpg)

# Warp Guide

## Project Snapshot

-**App**: AI Quiz Generator built with the Next.js App Router (`app/` directory)

-**Purpose**: Generate multiple-choice quizzes on demand via OpenAI Chat Completions

-**Key Modules**: UI pages in `app/`, constants in `app/constants/`, OpenAI streaming handler in `app/utils/OpenAIStream.js`

-**Data Flow**: Client selects quiz config → `/quiz` fetches `/api/chat` → OpenAI streams JSON quiz → Questions rendered and scored → `/end-screen` summarises results with gifs/messages

## Tech Stack

-**Framework**: Next.js 13.4.1 (App Router) running on Node.js 18+ with Edge Route support

-**Language**: React 18 client components with JSX; optional TypeScript config present (`tsconfig.json`)

-**Styling**: Tailwind CSS 3.3 with custom utility classes in `app/globals.css`

-**Animation & UX**: Framer Motion for progress bar, `react-simple-typewriter` for text effects, `react-use`, `react-confetti`, `react-icons`

-**AI Integration**: OpenAI Chat Completions API (`gpt-5-mini` model) consumed via streaming helper `OpenAIStream`

-**Tooling**: ESLint (`eslint-config-next`), PostCSS, Autoprefixer; npm scripts `dev`, `build`, `start`, `lint`

## Environment & Secrets

- Required variable: `OPENAI_API_KEY` for authenticated requests to OpenAI
- Store secrets in `.env.local` (Next.js default) or `.env`; see `env.example` template in repo
- Never commit actual keys; `.gitignore` already excludes `.env`

## Setup Checklist

- Install dependencies: `npm install`
- Copy environment template: `cp .env .env.local` (or manually export `OPENAI_API_KEY`)
- Run locally: `npm run dev` (default at http://localhost:3000)
- Lint before shipping: `npm run lint`

## Signup Links

Users can sign up using special invitation code links:

- **Sales Team**: `https://your-domain.com/?code=SALES`
- **Hostess Team**: `https://your-domain.com/?code=HOSTESS`

See [INVITATION_LINKS.md](./INVITATION_LINKS.md) for detailed instructions on creating and sharing signup links.

## Data & Configuration

- Quiz topics: `app/constants/topics.js`; arrays keyed by language; include `'Random'` as first entry for dynamic prompts
- Sample quiz data: `app/constants/testQuiz.js` used for fallback/manual testing
- End screen messaging: `app/constants/endMessages.js` grouped by `perfect | good | bad`
- Celebration gifs: `app/constants/gifs.js`; supply Giphy embed URLs grouped by score tier
- Fun facts (unused in core flow but available): `app/constants/facts.js`

## Behaviour Overview

-**Home (`app/page.jsx`)**: Collects `language`, `difficulty`, `topic`, `numQuestions`; forwards to `/quiz`

-**Quiz (`app/quiz/page.jsx`)**: Initiates POST to `/api/chat`; handles streaming, progressive rendering, scoring, highlight.js syntax styling

-**Question component**: Manages answer selection, submission, explains correct responses, updates progress counters

-**End Screen (`app/end-screen/page.jsx`)**: Calculates grade, shows dynamic message/gif, optional speech/Confetti based on performance

## API & Stream Handling

-**Endpoint**: `app/api/chat/route.js` (Edge runtime)

- Validates `OPENAI_API_KEY`
- Builds natural-language prompt from user selections
- Streams completion via `OpenAIStream`
- Expects JSON payload: `{ questions: [{ query, choices[], answer, explanation }] }`

-**Streaming Utility**: `app/utils/OpenAIStream.js`

- Wraps OpenAI SSE stream, pipes incremental tokens to Next.js response
- Requires `eventsource-parser`

## Modifying Data & Behaviour

-**New Topics/Domains**: Extend `topics` map; ensure lowercase keys match `language` URL query values

-**Difficulty/Question Count Defaults**: Adjust state initialisers in `app/page.jsx`

-**Prompt Tuning**: Edit `prompt` string in `/api/chat/route.js` (adjust `temperature`, `model`, instructions)

-**Answer Validation Rules**: Update `Question.jsx` logic if switching to non-index answers; maintain `answer` as number for current UI

-**Scoring Thresholds**: Modify grade calculation in `end-screen/page.jsx`

-**Accessibility**: Add ARIA roles/keyboard handling in `Question.jsx` for improved usability

## Testing Strategy

- Manual mock: swap API call for `testQuiz` in `/quiz` page when API quota is limited
- Suggested automation: add Vitest/React Testing Library for component logic; integrate Playwright for end-to-end flows
- Use `npm run lint` to enforce coding standards

## Deployment Notes

-**Preferred Host**: Vercel (Edge runtime supported); also compatible with Netlify Edge or self-hosted Node

-**Build Command**: `npm run build`; Output static assets + serverless functions

-**Environment Setup**:

- Add `OPENAI_API_KEY` in hosting provider dashboard
- Enable Edge runtime for `/api/chat`

-**Monitoring**: Track OpenAI usage quotas; handle rate limit errors with retries/backoff (not yet implemented)

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
