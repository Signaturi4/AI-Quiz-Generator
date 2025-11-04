-- Supabase schema definition for Nuanu Certifications Portal

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    display_name text,
    role text not null default 'employee',
    category text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_category_idx on public.profiles(category);

create table if not exists public.invitation_codes (
    code text primary key,
    role text not null default 'employee',
    category text,
    notes text,
    expires_at timestamptz,
    used_at timestamptz,
    used_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists invitation_codes_role_idx on public.invitation_codes(role);
create index if not exists invitation_codes_used_idx on public.invitation_codes(used_at);

create table if not exists public.question_pools (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.question_pool_versions (
    id uuid primary key default uuid_generate_v4(),
    pool_id uuid not null references public.question_pools(id) on delete cascade,
    version_number integer not null,
    status text not null default 'draft',
    notes text,
    created_by uuid,
    created_at timestamptz not null default now(),
    published_at timestamptz,
    unique (pool_id, version_number)
);

create table if not exists public.certifications (
    id uuid primary key default uuid_generate_v4(),
    code text not null unique,
    title text not null,
    description text,
    question_pool_id uuid not null references public.question_pools(id) on delete restrict,
    active boolean not null default true,
    duration_minutes integer,
    passing_threshold numeric(4,3) not null default 0.700,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.questions (
    id uuid primary key default uuid_generate_v4(),
    pool_version_id uuid not null references public.question_pool_versions(id) on delete cascade,
    topic text not null,
    prompt text not null,
    choices jsonb not null,
    answer_index smallint not null,
    explanation text,
    difficulty text,
    tags text[],
    order_index integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists questions_pool_version_idx on public.questions(pool_version_id);
create index if not exists questions_topic_idx on public.questions(topic);

create table if not exists public.assignments (
    id uuid primary key default uuid_generate_v4(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    certification_id uuid not null references public.certifications(id) on delete cascade,
    status text not null default 'pending',
    assigned_at timestamptz not null default now(),
    due_at timestamptz,
    last_attempt_at timestamptz,
    next_eligible_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists assignments_profile_idx on public.assignments(profile_id);
create index if not exists assignments_certification_idx on public.assignments(certification_id);

create table if not exists public.attempts (
    id uuid primary key default uuid_generate_v4(),
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    certification_id uuid not null references public.certifications(id) on delete cascade,
    pool_version_id uuid not null references public.question_pool_versions(id) on delete restrict,
    profile_id uuid not null,
    started_at timestamptz not null default now(),
    submitted_at timestamptz,
    score numeric(5,3),
    passed boolean,
    question_count integer not null,
    correct_count integer not null,
    responses jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists attempts_assignment_idx on public.attempts(assignment_id);
create index if not exists attempts_profile_idx on public.attempts(profile_id);

comment on table public.question_pool_versions is 'Immutable snapshot of a question pool used to version exams.';
comment on column public.questions.choices is 'Array of choices in display order.';
comment on column public.attempts.responses is 'JSON array: [{"question_id": uuid, "choice_index": int, "correct": bool}]';

