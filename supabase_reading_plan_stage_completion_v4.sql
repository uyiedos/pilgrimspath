-- =================================================================
-- READING PLAN STAGE COMPLETION LOGGING - VERSION 4
-- =================================================================
-- Run this in your Supabase SQL Editor to add proper stage completion tracking
-- This version fixes column reference errors and ambiguous naming

-- 1. DROP EXISTING FUNCTIONS AND TABLE TO AVOID CONFLICTS
DROP FUNCTION IF EXISTS public.complete_plan_stage CASCADE;
DROP FUNCTION IF EXISTS public.start_plan_stage CASCADE;
DROP FUNCTION IF EXISTS public.get_user_plan_stage_status CASCADE;
DROP VIEW IF EXISTS public.plan_completion_stats;
DROP TABLE IF EXISTS public.plan_stage_completions CASCADE;

-- 2. CREATE TABLE FOR INDIVIDUAL STAGE COMPLETIONS WITH STAGE IDs
CREATE TABLE public.plan_stage_completions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    plan_id text NOT NULL,
    stage_identifier text NOT NULL, -- Renamed to avoid ambiguity
    stage_number int NOT NULL,
    stage_title text NOT NULL,
    reading_reference text NOT NULL,
    user_reflection text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    xp_awarded int DEFAULT 50,
    
    -- Ensure unique constraint: one completion per user per stage
    UNIQUE(user_id, stage_identifier)
);

-- 3. ADD INDEXES FOR PERFORMANCE
CREATE INDEX idx_plan_stage_completions_user_plan ON public.plan_stage_completions(user_id, plan_id);
CREATE INDEX idx_plan_stage_completions_user_stage ON public.plan_stage_completions(user_id, stage_identifier);
CREATE INDEX idx_plan_stage_completions_completed_at ON public.plan_stage_completions(completed_at);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.plan_stage_completions ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICY FOR USERS TO MANAGE THEIR OWN COMPLETIONS
CREATE POLICY "Users manage own stage completions" ON public.plan_stage_completions 
FOR ALL USING (auth.uid() = user_id);

-- 6. CREATE POLICY FOR PUBLIC READ ACCESS (for sharing/leaderboards)
CREATE POLICY "Public read access stage completions" ON public.plan_stage_completions 
FOR SELECT USING (true);

-- 7. CREATE FUNCTION TO START A STAGE (LOGS START TIME)
CREATE FUNCTION start_plan_stage(
    p_user_id uuid,
    p_plan_id text,
    p_stage_identifier text,
    p_stage_number int,
    p_stage_title text,
    p_reading_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stage_record_id uuid;
BEGIN
    -- Insert or update stage start time
    INSERT INTO public.plan_stage_completions (
        user_id, plan_id, stage_identifier, stage_number, stage_title, reading_reference, started_at
    ) VALUES (
        p_user_id, p_plan_id, p_stage_identifier, p_stage_number, p_stage_title, p_reading_reference, now()
    )
    ON CONFLICT (user_id, stage_identifier) 
    DO UPDATE SET 
        started_at = now(),
        completed_at = NULL
    RETURNING id INTO stage_record_id;
    
    RETURN stage_record_id;
END;
$$;

-- 8. CREATE FUNCTION TO COMPLETE A STAGE WITH XP AWARD
CREATE FUNCTION complete_plan_stage(
    p_user_id uuid,
    p_plan_id text,
    p_stage_identifier text,
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
    is_new_completion boolean;
    completion_id uuid;
BEGIN
    -- Check if this stage was already completed
    SELECT completed_at IS NOT NULL INTO is_new_completion
    FROM public.plan_stage_completions 
    WHERE user_id = p_user_id AND stage_identifier = p_stage_identifier;
    
    -- Only proceed if not already completed
    IF NOT is_new_completion THEN
        -- Update the completion record
        UPDATE public.plan_stage_completions 
        SET 
            completed_at = now(),
            user_reflection = p_user_reflection,
            xp_awarded = p_xp_awarded
        WHERE user_id = p_user_id AND stage_identifier = p_stage_identifier
        RETURNING id INTO completion_id;
        
        -- If successful, update user's total XP
        IF completion_id IS NOT NULL THEN
            UPDATE public.users 
            SET total_points = COALESCE(total_points, 0) + p_xp_awarded
            WHERE id = p_user_id;
            
            -- Log to activity feed (if table exists)
            BEGIN
                INSERT INTO public.activity_feed (user_id, username, avatar, activity_type, metadata, xp_value)
                SELECT 
                    p_user_id, 
                    username, 
                    avatar, 
                    'stage_completion',
                    json_build_object(
                        'plan_id', p_plan_id,
                        'stage_identifier', p_stage_identifier,
                        'stage_number', p_stage_number,
                        'stage_title', p_stage_title,
                        'reading_reference', p_reading_reference
                    ),
                    p_xp_awarded
                FROM public.users 
                WHERE id = p_user_id;
            EXCEPTION WHEN OTHERS THEN
                -- Ignore if activity_feed doesn't exist or has issues
                NULL;
            END;
            
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

-- 9. CREATE FUNCTION TO GET USER'S STAGE COMPLETION STATUS
CREATE FUNCTION get_user_plan_stage_status(
    p_user_id uuid,
    p_plan_id text
)
RETURNS TABLE(
    stage_identifier text,
    stage_number int,
    stage_title text,
    reading_reference text,
    is_started boolean,
    is_completed boolean,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    user_reflection text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Generate stage_identifier from reading reference (e.g., "john_3_16")
        regexp_replace(lower(regexp_replace(d.reading, '[^a-zA-Z0-9]', '_', 'g')), '_+', '_', 'g') as stage_identifier,
        d.stage::int as stage_number,
        d.topic as stage_title,
        d.reading as reading_reference,
        COALESCE(c.started_at IS NOT NULL, false) as is_started,
        COALESCE(c.completed_at IS NOT NULL, false) as is_completed,
        c.started_at,
        c.completed_at,
        c.user_reflection
    FROM 
        -- Generate stages from plan's days_json
        jsonb_array_elements(
            COALESCE(
                (SELECT days_json FROM public.user_plans WHERE id = p_plan_id AND user_id = p_user_id),
                '[]'::jsonb
            )
        ) d
    LEFT JOIN public.plan_stage_completions c ON 
        c.user_id = p_user_id AND 
        c.plan_id = p_plan_id AND 
        c.stage_identifier = regexp_replace(lower(regexp_replace(d.reading, '[^a-zA-Z0-9]', '_', 'g')), '_+', '_', 'g')
    ORDER BY d.stage::int;
END;
$$;

-- 10. CREATE VIEW FOR COMPLETION STATISTICS (FIXED COLUMN REFERENCES)
CREATE VIEW plan_completion_stats AS
SELECT 
    c.plan_id,
    p.title as plan_title,
    COUNT(c.id) as total_completions,
    COUNT(DISTINCT c.user_id) as unique_users,
    AVG(c.xp_awarded) as avg_xp_per_stage,
    MAX(c.completed_at) as last_completion
FROM public.plan_stage_completions c
LEFT JOIN public.user_plans p ON c.plan_id = p.id
GROUP BY c.plan_id, p.title;

-- 11. GRANT PERMISSIONS
GRANT ALL ON public.plan_stage_completions TO authenticated;
GRANT ALL ON public.plan_stage_completions TO service_role;
GRANT EXECUTE ON FUNCTION start_plan_stage TO authenticated;
GRANT EXECUTE ON FUNCTION start_plan_stage TO service_role;
GRANT EXECUTE ON FUNCTION complete_plan_stage TO authenticated;
GRANT EXECUTE ON FUNCTION complete_plan_stage TO service_role;
GRANT EXECUTE ON FUNCTION get_user_plan_stage_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_stage_status TO service_role;
GRANT SELECT ON public.plan_completion_stats TO authenticated;
GRANT SELECT ON public.plan_completion_stats TO service_role;

COMMIT;
