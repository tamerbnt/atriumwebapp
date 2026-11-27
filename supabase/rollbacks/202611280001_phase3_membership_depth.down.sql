-- ============================================================================
-- Rollback: Atrium Phase 3 Migration (Step 1) — Section 7.1 Membership Depth
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.cancel_and_promote_gym_class_enrollment(uuid);

DROP TRIGGER IF EXISTS trg_audit_gym_trainer_commissions ON public.gym_trainer_commissions;
DROP TRIGGER IF EXISTS trg_audit_gym_member_freeze_logs ON public.gym_member_freeze_logs;

DROP TABLE IF EXISTS public.gym_trainer_commissions;
DROP TABLE IF EXISTS public.gym_member_freeze_logs;

DROP INDEX IF EXISTS public.idx_gym_members_auto_renew;
DROP INDEX IF EXISTS public.idx_gym_members_family_group;

ALTER TABLE public.gym_members
  DROP COLUMN IF EXISTS qr_token,
  DROP COLUMN IF EXISTS freeze_reason,
  DROP COLUMN IF EXISTS freeze_fee_centimes,
  DROP COLUMN IF EXISTS freeze_days_used,
  DROP COLUMN IF EXISTS freeze_until,
  DROP COLUMN IF EXISTS frozen_at,
  DROP COLUMN IF EXISTS family_role,
  DROP COLUMN IF EXISTS family_group_id,
  DROP COLUMN IF EXISTS billing_cycle_days,
  DROP COLUMN IF EXISTS auto_renew;

COMMIT;
