-- =============================================================================
-- UNIVERSAL ATTENDANCE SYSTEM - SUPABASE SEED DATA
-- =============================================================================

-- 1. Initial Default Workspace
INSERT INTO public.workspaces (
    id, name, currency, red_penalty_amount, black_penalty_amount,
    early_window_start, early_window_end, normal_window_end, late_window_end,
    reward_threshold, reward_amount_desc, allow_remote, kiosk_code
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Rixos Radamis (Sharm El-Sheikh)',
    'EGP',
    250,
    1000,
    '07:00',
    '08:00',
    '10:00',
    '12:00',
    30,
    '40 USD / 2,200 EGP',
    false,
    'SHARM1'
) ON CONFLICT (id) DO NOTHING;

-- 2. Initial Shifts
INSERT INTO public.shifts (id, workspace_id, name, start_time, end_time, description)
VALUES 
(
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Morning Shift',
    '07:00',
    '15:00',
    'Resort morning & breakfast'
),
(
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Evening Shift',
    '15:00',
    '23:00',
    'Sunset sessions, beach parties & galas'
),
(
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    'Night Shift',
    '23:00',
    '07:00',
    'Overnight system maintenance'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Initial Branches (Resort Geofences)
INSERT INTO public.branches (id, workspace_id, name, latitude, longitude, radius_meters)
VALUES
(
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    'Rixos Radamis (Sharm El-Sheikh)',
    27.9158,
    34.3300,
    300
),
(
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000001',
    'Cairo Corporate Headquarters',
    30.0444,
    31.2357,
    300
)
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Audit Logs
INSERT INTO public.audit_logs (workspace_id, actor_email, action, ip_location, detail)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'salehhamdy599@gmail.com',
    'SYSTEM_SCHEMA_INITIALIZED',
    'Cairo, EG',
    'Supabase PostgreSQL multi-tenant schema provisioned with RLS and cascading security triggers.'
);

