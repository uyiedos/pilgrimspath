-- =================================================================
-- PILGRIM GAME PROGRESS TRACKING
-- =================================================================
-- Run this in your Supabase SQL Editor to add game progress tracking

-- 1. ADD COLUMNS FOR GAME PROGRESS TO USERS TABLE
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS game_progress JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS collected_verses TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- 2. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_game_progress ON public.users USING GIN (game_progress);
CREATE INDEX IF NOT EXISTS idx_users_collected_verses ON public.users USING GIN (collected_verses);

-- 3. CREATE FUNCTION TO SAVE GAME PROGRESS
CREATE OR REPLACE FUNCTION save_game_progress(
    p_user_id UUID,
    p_game_progress JSONB,
    p_collected_verses TEXT[],
    p_total_xp INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users 
    SET 
        game_progress = p_game_progress,
        collected_verses = p_collected_verses,
        total_xp = p_total_xp,
        last_activity_date = CURRENT_DATE
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE FUNCTION TO LOAD GAME PROGRESS
CREATE OR REPLACE FUNCTION load_game_progress(p_user_id UUID)
RETURNS TABLE(
    game_progress JSONB,
    collected_verses TEXT[],
    total_xp INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.game_progress,
        u.collected_verses,
        u.total_xp
    FROM public.users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE POLICY FOR GAME PROGRESS FUNCTIONS
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.save_game_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_game_progress TO authenticated;

-- 6. CREATE TRIGGER TO UPDATE LAST_ACTIVITY_DATE WHEN GAME PROGRESS CHANGES
CREATE OR REPLACE FUNCTION update_last_activity_on_game_progress()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_date = CURRENT_DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_game_progress_activity ON public.users;
CREATE TRIGGER trigger_update_game_progress_activity
    BEFORE UPDATE OF game_progress, collected_verses, total_xp
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity_on_game_progress();
