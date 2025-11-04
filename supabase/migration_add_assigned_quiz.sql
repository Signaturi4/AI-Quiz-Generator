-- Add assigned_pool_version_id to users table to track which quiz variation is assigned
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS assigned_pool_version_id uuid REFERENCES public.question_pool_versions(id);

-- Add foreign key constraint from assignments.profile_id to users.id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignments_profile_id_fkey'
  ) THEN
    ALTER TABLE public.assignments 
      ADD CONSTRAINT assignments_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on assigned_pool_version_id for faster lookups
CREATE INDEX IF NOT EXISTS users_assigned_pool_version_idx ON public.users(assigned_pool_version_id);

COMMENT ON COLUMN public.users.assigned_pool_version_id IS 'Tracks which specific quiz version (10-question variation) is assigned to this user';

