-- =================================================================
-- READING PLAN STAGE COMPLETION LOGGING
-- =================================================================
-- Run this in your Supabase SQL Editor to add proper stage completion tracking

-- 1. CREATE TABLE FOR INDIVIDUAL STAGE COMPLETIONS
CREATE TABLE IF NOT EXISTS public.plan_stage_completions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    plan_id text NOT NULL,
    stage_number int NOT NULL,
    stage_title text NOT NULL,
    reading_reference text NOT NULL,
    user_reflection text,
    completed_at timestamp with time zone DEFAULT now(),
    xp_awarded int DEFAULT 50,
    
    -- Ensure unique constraint: one completion per user per plan per stage
    UNIQUE(user_id, plan_id, stage_number)
);

-- 2. ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_plan_stage_completions_user_plan ON public.plan_stage_completions(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_stage_completions_user ON public.plan_stage_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_stage_completions_completed_at ON public.plan_stage_completions(completed_at);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.plan_stage_completions ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICY FOR USERS TO MANAGE THEIR OWN COMPLETIONS
DROP POLICY IF EXISTS "Users manage own stage completions" ON public.plan_stage_completions;
CREATE POLICY "Users manage own stage completions" ON public.plan_stage_completions 
FOR ALL USING (auth.uid() = user_id);

-- 5. CREATE POLICY FOR PUBLIC READ ACCESS (for sharing/leaderboards)
DROP POLICY IF EXISTS "Public read access stage completions" ON public.plan_stage_completions;
CREATE POLICY "Public read access stage completions" ON public.plan_stage_completions 
FOR SELECT USING (true);

-- 6. CREATE FUNCTION TO LOG STAGE COMPLETION WITH XP AWARD
CREATE OR REPLACE FUNCTION log_plan_stage_completion(
    p_user_id uuid,
    p_plan_id text,
    p_stage_number int,
    p_stage_title text,
    p_reading_reference text,
    p_user_reflection text DEFAULT '',
    p_xp_awarded int DEFAULT 50
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    completion_id uuid;
    is_new_completion boolean;
BEGIN
    -- Insert or ignore if already completed
    INSERT INTO public.plan_stage_completions (
        user_id, plan_id, stage_number, stage_title, reading_reference, user_reflection, xp_awarded
    ) VALUES (
        p_user_id, p_plan_id, p_stage_number, p_stage_title, p_reading_reference, p_user_reflection, p_xp_awarded
    )
    ON CONFLICT (user_id, plan_id, stage_number) 
    DO NOTHING
    RETURNING id INTO completion_id;
    
    -- Check if this was a new completion
    is_new_completion := completion_id IS NOT NULL;
    
    -- If new completion, update user's total XP
    IF is_new_completion THEN
        UPDATE public.users 
        SET total_points = COALESCE(total_points, 0) + p_xp_awarded
        WHERE id = p_user_id;
        
        -- Log to activity feed
        INSERT INTO public.activity_feed (user_id, username, avatar, activity_type, metadata, xp_value)
        SELECT 
            p_user_id, 
            username, 
            avatar, 
            'stage_completion',
            json_build_object(
                'plan_id', p_plan_id,
                'stage_number', p_stage_number,
                'stage_title', p_stage_title,
                'reading_reference', p_reading_reference
            ),
            p_xp_awarded
        FROM public.users 
        WHERE id = p_user_id;
    END IF;
    
    RETURN is_new_completion;
END;
$$;

-- 7. CREATE FUNCTION TO GET USER'S STAGE COMPLETION STATUS
CREATE OR REPLACE FUNCTION get_user_plan_stage_status(
    p_user_id uuid,
    p_plan_id text
)
RETURNS TABLE(
    stage_number int,
    is_completed boolean,
    completed_at timestamp with time zone,
    user_reflection text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.stage::int as stage_number,
        COALESCE(c.completed_at IS NOT NULL, false) as is_completed,
        c.completed_at,
        c.user_reflection
    FROM 
        -- Generate stages from plan's days_json or default to duration
        (SELECT 
            CASE 
                WHEN EXISTS(SELECT 1 FROM public.user_plans WHERE id = p_plan_id AND user_id = p_user_id AND days_json IS NOT NULL)
                THEN jsonb_array_elements(days_json)->>'day'
                ELSE generate_series(1, (SELECT duration FROM public.user_plans WHERE id = p_plan_id AND user_id = p_user_id))::text
            END as stage
        FROM public.user_plans 
        WHERE id = p_plan_id AND user_id = p_user_id
        LIMIT 1) d
    LEFT JOIN public.plan_stage_completions c ON 
        c.user_id = p_user_id AND 
        c.plan_id = p_plan_id AND 
        c.stage_number = d.stage::int
    ORDER BY d.stage::int;
END;
$$;

-- 8. CREATE VIEW FOR STAGE COMPLETION STATISTICS
CREATE OR REPLACE VIEW plan_completion_stats AS
SELECT 
    p.plan_id,
    p.title as plan_title,
    COUNT(c.id) as total_completions,
    COUNT(DISTINCT c.user_id) as unique_users,
    AVG(c.xp_awarded) as avg_xp_per_stage,
    MAX(c.completed_at) as last_completion
FROM public.user_plans p
LEFT JOIN public.plan_stage_completions c ON p.id = c.plan_id
GROUP BY p.plan_id, p.title;

-- 9. GRANT PERMISSIONS
GRANT ALL ON public.plan_stage_completions TO authenticated;
GRANT ALL ON public.plan_stage_completions TO service_role;
GRANT EXECUTE ON FUNCTION log_plan_stage_completion TO authenticated;
GRANT EXECUTE ON FUNCTION log_plan_stage_completion TO service_role;
GRANT EXECUTE ON FUNCTION get_user_plan_stage_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_stage_status TO service_role;
GRANT SELECT ON public.plan_completion_stats TO authenticated;
GRANT SELECT ON public.plan_completion_stats TO service_role;

COMMIT;
