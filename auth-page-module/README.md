# Auth Page and API Route Module for Next.js

This module provides the core components for a login/signup page and the associated API route for user registration in a Next.js application. It is designed to be used in conjunction with the `supabase-auth-module` for full authentication functionality.

## Module Structure

```
auth-page-module/
├── api/
│   └── auth/
│       └── register/     # API route for user registration
│           └── route.ts
├── app/
│   └── login/            # Next.js App Router login page
│       └── page.jsx
└── README.md
```

## Core Functionality

### 1. User Registration API Route (`api/auth/register/route.ts`)

This API route handles the registration of new users. It typically:

*   Receives user data (e.g., email, password, first name, last name, invitation code) from the client.
*   Interacts with Supabase (or another authentication backend) to create a new user.
*   Handles any custom logic for user metadata (e.g., assigning initial roles or categories based on an invitation code).
*   Returns appropriate responses based on the success or failure of the registration.

### 2. Login/Signup Page (`app/login/page.jsx`)

This is the main client-side page that renders the user interface for login and signup. It:

*   Utilizes the `CorpLogin` component (from the `supabase-auth-module`) to display the login and signup forms.
*   Manages local state for form inputs.
*   Triggers the `signIn` and `signUp` functions provided by the `SupabaseAuthProvider` (also from the `supabase-auth-module`).
*   Handles client-side redirection to the appropriate dashboard (`/employee`) after successful authentication.

## How to Replicate in Another Next.js Project

To integrate this module into a new Next.js project, follow these steps:

### 1. Prerequisites

Ensure you have already integrated the `supabase-auth-module` as this module depends on it.

### 2. Copy the Module

Copy the entire `auth-page-module` directory into your new Next.js project's root or a designated `modules` or `src/auth` folder. It's recommended to place the `api` and `app` subdirectories within your project's existing `api` and `app` structures, respectively.

For example:

*   Copy `auth-page-module/api/auth/register/route.ts` to `your-project-root/app/api/auth/register/route.ts`.
*   Copy `auth-page-module/app/login/page.jsx` to `your-project-root/app/login/page.jsx`.

### 3. Update Paths

Review all `import` statements within the copied files and update them to reflect the new relative paths in your project. Specifically, the `app/login/page.jsx` will need to correctly import the `CorpLogin` component from wherever you placed the `supabase-auth-module`.

Example adjustment in `app/login/page.jsx`:

```jsx
// Before:
import CorpLogin from '../../supabase-auth-module/components/CorpLogin';

// After (if supabase-auth-module is at project root):
import CorpLogin from '../../../supabase-auth-module/components/CorpLogin';
// Or if supabase-auth-module is in a shared modules directory:
// import CorpLogin from '@/modules/supabase-auth-module/components/CorpLogin';
```

### 4. Environment Variables & Supabase Setup

Ensure that all environment variables and Supabase setup steps outlined in the `supabase-auth-module`'s `README.md` are correctly configured, as this module relies on them.

## Usage and Customization

*   **Registration Logic**: Modify the `route.ts` file in `api/auth/register` to customize the user registration process, including any specific validation, data processing, or interaction with your Supabase schema.
*   **UI Customization**: The `app/login/page.jsx` acts as a wrapper. Further UI customization for the login/signup forms should be done in the `CorpLogin.jsx` component (located in your `supabase-auth-module/components` folder).
*   **Redirection Logic**: The client-side redirection after successful login/signup is handled within `CorpLogin.jsx`. Adjust this if you need different post-authentication landing pages.

This module complements the `supabase-auth-module` by providing the specific API endpoint and UI page for user authentication, enabling a complete and reusable authentication solution for your Next.js projects.
