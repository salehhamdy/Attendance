-- =============================================================================
-- UNIVERSAL ATTENDANCE SYSTEM - COMPLETE SUPABASE MIGRATION SCRIPT
-- =============================================================================
-- This script provisions the complete multi-tenant database schema, extensions,
-- table constraints, Row-Level Security (RLS) policies, atomic functions,
-- automated cascading triggers, performance indexes, and seed records for
-- Supabase (PostgreSQL 15+).
--
-- Execution: Paste and run directly in the Supabase Dashboard SQL Editor.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. WORKSPACES (Tenants / Businesses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EGP',
    red_penalty_amount NUMERIC NOT NULL DEFAULT 250,
    black_penalty_amount NUMERIC NOT NULL DEFAULT 1000,
    early_window_start TIME NOT NULL DEFAULT '07:00',
    early_window_end TIME NOT NULL DEFAULT '08:00',
    normal_window_end TIME NOT NULL DEFAULT '10:00',
    late_window_end TIME NOT NULL DEFAULT '12:00',
    reward_threshold INTEGER NOT NULL DEFAULT 30,
    reward_amount_desc TEXT NOT NULL DEFAULT '40 USD / 2,200 EGP',
    allow_remote BOOLEAN NOT NULL DEFAULT FALSE,
    kiosk_code TEXT NOT NULL DEFAULT 'SHARM1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. SHIFTS (Timetable Templates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. PROFILES (Extends auth.users with Hierarchical Roles & Point Balances)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'owner', 'employee')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    green_points INTEGER NOT NULL DEFAULT 0 CHECK (green_points >= 0),
    red_penalties INTEGER NOT NULL DEFAULT 0 CHECK (red_penalties >= 0),
    black_penalties INTEGER NOT NULL DEFAULT 0 CHECK (black_penalties >= 0),
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. BRANCHES (Resort Geofences & Physical Locations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. ATTENDANCE LEDGER (Point Ledger, Check-ins, Verification & History)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    delta_green INTEGER NOT NULL DEFAULT 0,
    delta_red INTEGER NOT NULL DEFAULT 0,
    delta_black INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    photo_url TEXT,
    accuracy_meters NUMERIC,
    kiosk_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    checkin_lat DOUBLE PRECISION,
    checkin_lng DOUBLE PRECISION
);

-- =============================================================================
-- 6. LEAVE REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_date_order CHECK (end_date >= start_date)
);

-- =============================================================================
-- 7. REWARD CLAIMS (Milestone Payout Requests)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reward_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('vodafone_cash', 'instapay', 'bank', 'cash')),
    account_number TEXT NOT NULL,
    amount_usd NUMERIC NOT NULL DEFAULT 40,
    amount_local NUMERIC NOT NULL DEFAULT 2200,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. AUDIT LOGS (Platform Security & Governance Chronological Trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_location TEXT,
    detail TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9. BUSINESS LOGIC FUNCTIONS & AUTOMATED TRIGGERS
-- =============================================================================

-- A. Protect Immutable Superadmin Account
CREATE OR REPLACE FUNCTION fn_protect_superadmin()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_immutable THEN
        RAISE EXCEPTION 'Operation prohibited: The platform superadmin account is immutable and cannot be removed, suspended, or modified.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_superadmin ON public.profiles;
CREATE TRIGGER trg_protect_superadmin
BEFORE DELETE OR UPDATE ON public.profiles
FOR EACH ROW WHEN (OLD.is_immutable = TRUE)
EXECUTE FUNCTION fn_protect_superadmin();

-- B. Cascading Owner Suspension Trigger
CREATE OR REPLACE FUNCTION fn_cascade_owner_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'owner' AND NEW.status <> OLD.status THEN
        UPDATE public.profiles
        SET status = NEW.status, updated_at = NOW()
        WHERE owner_id = NEW.id;

        INSERT INTO public.audit_logs (workspace_id, actor_email, action, ip_location, detail)
        VALUES (
            NEW.workspace_id,
            COALESCE(auth.jwt() ->> 'email', 'system'),
            CASE WHEN NEW.status = 'suspended' THEN 'OWNER_CASCADING_SUSPENSION' ELSE 'OWNER_CASCADING_REINSTATEMENT' END,
            'Postgres Trigger',
            format('Owner "%s" status set to %s. All governed team members updated simultaneously.', NEW.full_name, NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_owner_status ON public.profiles;
CREATE TRIGGER trg_cascade_owner_status
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION fn_cascade_owner_status();

-- C. Cascading Owner Removal Trigger
CREATE OR REPLACE FUNCTION fn_cascade_owner_removal()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'owner' THEN
        DELETE FROM public.profiles WHERE owner_id = OLD.id;
        INSERT INTO public.audit_logs (workspace_id, actor_email, action, ip_location, detail)
        VALUES (
            OLD.workspace_id,
            COALESCE(auth.jwt() ->> 'email', 'system'),
            'OWNER_CASCADING_REMOVAL',
            'Postgres Trigger',
            format('Owner "%s" removed. All team members under this owner permanently deleted.', OLD.full_name)
        );
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_owner_removal ON public.profiles;
CREATE TRIGGER trg_cascade_owner_removal
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION fn_cascade_owner_removal();

-- D. Atomic Stored Procedure: Cancel Red Penalty (1 Green Point -> 1 Red Penalty)
CREATE OR REPLACE FUNCTION fn_cancel_red_penalty(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found.';
    END IF;

    IF v_profile.green_points < 1 OR v_profile.red_penalties < 1 THEN
        RAISE EXCEPTION 'Insufficient points: Requires at least 1 Green Point and 1 active Red Penalty.';
    END IF;

    UPDATE public.profiles
    SET green_points = green_points - 1,
        red_penalties = red_penalties - 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.attendance_ledger (
        workspace_id, user_id, action, zone_name,
        delta_green, delta_red, delta_black, note
    ) VALUES (
        v_profile.workspace_id, p_user_id, 'Red Penalty Cancelled', 'Point Exchange',
        -1, -1, 0, '1 Red Penalty cancelled using 1 Green Point'
    );

    RETURN json_build_object('success', true, 'message', '1 Red Penalty cancelled (-1 Green Point)');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. Atomic Stored Procedure: Cancel Black Penalty (5 Green Points -> 1 Black Penalty)
CREATE OR REPLACE FUNCTION fn_cancel_black_penalty(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found.';
    END IF;

    IF v_profile.green_points < 5 OR v_profile.black_penalties < 1 THEN
        RAISE EXCEPTION 'Insufficient points: Requires at least 5 Green Points and 1 active Black Penalty.';
    END IF;

    UPDATE public.profiles
    SET green_points = green_points - 5,
        black_penalties = black_penalties - 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.attendance_ledger (
        workspace_id, user_id, action, zone_name,
        delta_green, delta_red, delta_black, note
    ) VALUES (
        v_profile.workspace_id, p_user_id, 'Black Penalty Cancelled', 'Point Exchange',
        -5, 0, -1, '1 Black Penalty cancelled using 5 Green Points'
    );

    RETURN json_build_object('success', true, 'message', '1 Black Penalty cancelled (-5 Green Points)');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- F. Haversine Spatial Distance Calculator (Meters)
CREATE OR REPLACE FUNCTION fn_haversine_distance(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    r CONSTANT DOUBLE PRECISION := 6371000; -- Earth radius in meters
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get role from app_metadata (never user_metadata)
CREATE OR REPLACE FUNCTION auth.get_jwt_role()
RETURNS TEXT AS $$
    SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'employee');
$$ LANGUAGE sql STABLE;

-- Profiles Policies
CREATE POLICY "profiles_select_auth" ON public.profiles
FOR SELECT TO authenticated
USING (
    auth.get_jwt_role() = 'superadmin' OR
    workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid()))
);

CREATE POLICY "profiles_update_auth" ON public.profiles
FOR UPDATE TO authenticated
USING (
    auth.get_jwt_role() = 'superadmin' OR
    (auth.get_jwt_role() = 'owner' AND workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid()))) OR
    id = (SELECT auth.uid())
)
WITH CHECK (
    auth.get_jwt_role() = 'superadmin' OR
    (auth.get_jwt_role() = 'owner' AND workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid()))) OR
    id = (SELECT auth.uid())
);

-- Ledger Policies
CREATE POLICY "ledger_select_auth" ON public.attendance_ledger
FOR SELECT TO authenticated
USING (
    auth.get_jwt_role() = 'superadmin' OR
    user_id = (SELECT auth.uid()) OR
    (auth.get_jwt_role() = 'owner' AND workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
);

CREATE POLICY "ledger_insert_auth" ON public.attendance_ledger
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    auth.get_jwt_role() IN ('owner', 'superadmin')
);

-- Leave Policies
CREATE POLICY "leave_select_auth" ON public.leave_requests
FOR SELECT TO authenticated
USING (
    auth.get_jwt_role() = 'superadmin' OR
    user_id = (SELECT auth.uid()) OR
    (auth.get_jwt_role() = 'owner' AND workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
);

CREATE POLICY "leave_insert_auth" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "leave_update_auth" ON public.leave_requests
FOR UPDATE TO authenticated
USING (auth.get_jwt_role() IN ('owner', 'superadmin'))
WITH CHECK (auth.get_jwt_role() IN ('owner', 'superadmin'));

-- Reward Policies
CREATE POLICY "reward_select_auth" ON public.reward_claims
FOR SELECT TO authenticated
USING (
    auth.get_jwt_role() = 'superadmin' OR
    user_id = (SELECT auth.uid()) OR
    (auth.get_jwt_role() = 'owner' AND workspace_id = (SELECT workspace_id FROM public.profiles WHERE id = (SELECT auth.uid())))
);

CREATE POLICY "reward_insert_auth" ON public.reward_claims
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "reward_update_auth" ON public.reward_claims
FOR UPDATE TO authenticated
USING (auth.get_jwt_role() IN ('owner', 'superadmin'))
WITH CHECK (auth.get_jwt_role() IN ('owner', 'superadmin'));

-- Audit Logs Policy
CREATE POLICY "audit_select_superadmin" ON public.audit_logs
FOR SELECT TO authenticated
USING (auth.get_jwt_role() = 'superadmin');

-- Shifts & Branches Policies
CREATE POLICY "shifts_select_auth" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_modify_owner" ON public.shifts FOR ALL TO authenticated
USING (auth.get_jwt_role() IN ('owner', 'superadmin'))
WITH CHECK (auth.get_jwt_role() IN ('owner', 'superadmin'));

CREATE POLICY "branches_select_auth" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_modify_owner" ON public.branches FOR ALL TO authenticated
USING (auth.get_jwt_role() IN ('owner', 'superadmin'))
WITH CHECK (auth.get_jwt_role() IN ('owner', 'superadmin'));

-- Workspaces Policies
CREATE POLICY "workspaces_select_auth" ON public.workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "workspaces_modify_auth" ON public.workspaces FOR ALL TO authenticated
USING (auth.get_jwt_role() IN ('owner', 'superadmin'))
WITH CHECK (auth.get_jwt_role() IN ('owner', 'superadmin'));

-- =============================================================================
-- 11. PERFORMANCE INDEXES (Supabase Postgres Best Practices)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner ON public.profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_branches_workspace ON public.branches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shifts_workspace ON public.shifts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.attendance_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_workspace ON public.attendance_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON public.attendance_ledger(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON public.reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);

-- =============================================================================
-- 12. STORAGE BUCKET CONFIGURATION (Webcam Verification Selfies)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Storage Upload Selfie Policy"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'checkin-photos');

CREATE POLICY "Storage View Selfie Policy"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'checkin-photos');
