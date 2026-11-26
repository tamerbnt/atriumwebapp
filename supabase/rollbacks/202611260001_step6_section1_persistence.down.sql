-- ============================================================================
-- Atrium Step 6 Rollback: Revert Section 1 Persistence Objects (1.1 - 1.5)
-- ============================================================================

-- 1.5 Revert POS Refund & Undo RPCs
DROP FUNCTION IF EXISTS public.pos_undo_refund_with_stock(uuid, uuid, jsonb, text, text);
DROP FUNCTION IF EXISTS public.pos_refund_with_stock(uuid, uuid, jsonb, text, text, jsonb);

-- 1.4 Drop POS Cash Drawer & Z-Report Tables + Trigger Function
DROP TRIGGER IF EXISTS trg_pos_z_reports_audit ON public.pos_z_reports;
DROP TRIGGER IF EXISTS trg_pos_z_reports_optimistic_version ON public.pos_z_reports;
DROP TRIGGER IF EXISTS trg_pos_z_reports_updated_at ON public.pos_z_reports;
DROP TRIGGER IF EXISTS trg_pos_z_reports_immutable ON public.pos_z_reports;
DROP TABLE IF EXISTS public.pos_z_reports CASCADE;
DROP FUNCTION IF EXISTS public.fn_protect_immutable_pos_z_report();

DROP TRIGGER IF EXISTS trg_pos_cash_movements_audit ON public.pos_cash_movements;
DROP TRIGGER IF EXISTS trg_pos_cash_movements_optimistic_version ON public.pos_cash_movements;
DROP TRIGGER IF EXISTS trg_pos_cash_movements_updated_at ON public.pos_cash_movements;
DROP TABLE IF EXISTS public.pos_cash_movements CASCADE;

DROP TRIGGER IF EXISTS trg_pos_cash_sessions_audit ON public.pos_cash_sessions;
DROP TRIGGER IF EXISTS trg_pos_cash_sessions_optimistic_version ON public.pos_cash_sessions;
DROP TRIGGER IF EXISTS trg_pos_cash_sessions_updated_at ON public.pos_cash_sessions;
DROP TABLE IF EXISTS public.pos_cash_sessions CASCADE;

-- 1.3 Revert Salon Chair Station Extra Columns
ALTER TABLE public.salon_chair_stations
  DROP COLUMN IF EXISTS stage,
  DROP COLUMN IF EXISTS service_price_centimes,
  DROP COLUMN IF EXISTS current_appointment_id;

-- 1.2 Revert Education Attendance Dedupe Index & Columns
DROP INDEX IF EXISTS public.uq_edu_attendance_session_student_active;
ALTER TABLE public.edu_attendance
  DROP COLUMN IF EXISTS change_history,
  DROP COLUMN IF EXISTS is_locked,
  DROP COLUMN IF EXISTS marked_at,
  DROP COLUMN IF EXISTS marked_by;

-- 1.1 Restore original 4-arg gym_record_check_in RPC & drop override columns
DROP FUNCTION IF EXISTS public.gym_record_check_in(uuid, uuid, text, text, uuid, int, uuid, text);

CREATE OR REPLACE FUNCTION public.gym_record_check_in(
  p_branch_id uuid,
  p_member_id uuid,
  p_method text DEFAULT 'rfid',
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member record;
  v_status text := 'granted';
  v_new_sessions int;
  v_checkin_id uuid;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  SELECT * INTO v_member
  FROM public.gym_members
  WHERE id = p_member_id AND branch_id = p_branch_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MEMBER_NOT_FOUND');
  END IF;

  IF v_member.status IN ('Banned', 'Suspended', 'Frozen') THEN
    v_status := 'denied_frozen';
  ELSIF v_member.status = 'Expired' OR (v_member.expiration_date IS NOT NULL AND v_member.expiration_date < CURRENT_DATE) THEN
    v_status := 'denied_expired';
  ELSIF v_member.remaining_sessions IS NOT NULL AND v_member.remaining_sessions <= 0 THEN
    v_status := 'denied_quota';
  END IF;

  v_new_sessions := v_member.remaining_sessions;
  IF v_status = 'granted' AND v_member.remaining_sessions IS NOT NULL THEN
    v_new_sessions := GREATEST(0, v_member.remaining_sessions - 1);
    UPDATE public.gym_members
    SET remaining_sessions = v_new_sessions,
        updated_at = now()
    WHERE id = v_member.id;
  END IF;

  INSERT INTO public.gym_check_ins (
    account_id, business_id, branch_id, staff_id, device_id,
    member_id, member_name, method, status, remaining_sessions_after
  ) VALUES (
    v_member.account_id, v_member.business_id, v_member.branch_id, public.get_auth_staff_id(), p_device_id,
    v_member.id, v_member.full_name, COALESCE(p_method, 'rfid'), v_status, v_new_sessions
  ) RETURNING id INTO v_checkin_id;

  RETURN jsonb_build_object(
    'success', (v_status = 'granted'),
    'status', v_status,
    'checkInId', v_checkin_id,
    'remainingSessions', v_new_sessions
  );
END;
$$;

ALTER TABLE public.gym_check_ins
  DROP COLUMN IF EXISTS override_reason,
  DROP COLUMN IF EXISTS override_by_staff_id;
