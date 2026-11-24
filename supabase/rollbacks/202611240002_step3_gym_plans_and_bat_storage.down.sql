-- Rollback for 202611240002_step3_gym_plans_and_bat_storage.sql
BEGIN;

UPDATE public.gym_plans
SET duration_days = 30
WHERE duration_days IS NULL;

ALTER TABLE public.gym_plans
  ALTER COLUMN duration_days SET DEFAULT 30,
  ALTER COLUMN duration_days SET NOT NULL;

ALTER TABLE public.gym_plans
  DROP COLUMN IF EXISTS total_sessions;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE storage.buckets
      SET allowed_mime_types = ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/svg+xml',
        'application/postscript'
      ]
      WHERE id = 'bat-deliverables'
    $sql$;
  END IF;
END $$;

COMMIT;
