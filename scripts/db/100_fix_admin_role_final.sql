-- Fix admin role and approved status
-- This ensures the admin user is properly configured

-- First, let's check the current state and fix the role constraint
-- The role field should accept both old and new values
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
    AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
END $$;

-- Add a more flexible role constraint that accepts all possible values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'administrador', 'user', 'editor', 'copywriter', 'gestor_trafego', 'minerador', 'pending'));

-- Ensure the approved column exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Set Igor (or any user with 'igor' in email) as admin and approved
UPDATE public.profiles
SET
  role = 'admin',
  approved = true
WHERE
  email LIKE '%igor%'
  OR email LIKE '%admin%'
  OR id IN (
    SELECT id FROM public.profiles
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Also update any existing admin/administrador users to be approved
UPDATE public.profiles
SET approved = true
WHERE role IN ('admin', 'administrador');

-- Ensure all other existing users are approved (they were working before)
UPDATE public.profiles
SET approved = true
WHERE created_at < NOW() - INTERVAL '1 day'
  AND approved IS NULL OR approved = false;

-- Log the results
DO $$
DECLARE
  admin_count INTEGER;
  approved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role IN ('admin', 'administrador');

  SELECT COUNT(*) INTO approved_count
  FROM public.profiles
  WHERE approved = true;

  RAISE NOTICE 'Admin users: %, Approved users: %', admin_count, approved_count;
END $$;