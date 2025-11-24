# Project Documentation: AI Quiz Generator

## Overview
This is a Next.js 13 (App Router) application with Supabase for backend (Auth + Database). It enables creating and taking certification quizzes, tracking assignments, and generating certificates.

**Tech Stack:**
- **Frontend:** Next.js 13.4, React 18, Tailwind CSS 3.3
- **Backend:** Supabase (PostgreSQL + Auth)
- **Language:** TypeScript / JavaScript

## 1. Setup & Installation

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    Create a `.env.local` file in the root directory (see `.env.example` if available, otherwise use this template):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    ```

## 2. Database Setup (Supabase)

1.  **Create a Supabase Project**
2.  **Run Schema:**
    Run the contents of `supabase/corrected_schema.sql` in your Supabase SQL Editor.
    *Note: This file consolidates the schema and migrations into a single correct setup that matches the application code (using `public.users` instead of `public.profiles`).*

3.  **Seed Data:**
    Populate the database with initial quizzes, invitation codes, and test users.
    ```bash
    npm run supabase:seed
    ```
    *This script (`scripts/seedSupabase.js`) populates default data necessary for the app to function.*

## 3. Development Workflow

**Start the development server:**
```bash
npm run dev
```
Access the app at `http://localhost:3000`.

**Project Structure:**
- `app/`: Next.js App Router pages and API routes.
- `lib/`: Shared utilities.
    - `supabase/`: Supabase client configuration.
    - `services/`: Business logic (e.g., `questionBankService.ts`).
- `scripts/`: Node.js scripts for database maintenance.
- `supabase/`: SQL schemas and migrations.

## 4. Deployment (Vercel)

1.  **Import Project:** Import the repository into Vercel.
2.  **Build Settings:**
    - Framework: Next.js
    - Build Command: `npm run build`
    - Install Command: `npm install`
3.  **Environment Variables:**
    Add the following in Vercel Project Settings:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
4.  **Supabase Config:**
    - Go to Supabase Dashboard > Authentication > URL Configuration.
    - Add your Vercel deployment URL (e.g., `https://your-project.vercel.app`) to **Site URL** and **Redirect URLs**.

## 5. Maintenance & Important Notes

-   **Invitation Codes:** Users sign up using codes found in the `public.invitation_codes` table.
    -   Default seeds: `NUANU-SALES-7G4XQ`, `NUANU-HOST-5T2VZ`.
-   **Roles:**
    -   `admin`: Access to `/admin` dashboard.
    -   `employee`: Access to `/employee` dashboard (quizzes).
-   **Adding Questions:** Use the Admin Dashboard or modify `scripts/seedSupabase.js` and re-run (warning: re-running seed clears tables).
-   **Troubleshooting:**
    -   If "User not found" errors occur, ensure `supabase/corrected_schema.sql` was used, as the code relies on the `public.users` table (not `profiles`).
