# Reading Plan Stage Completion System

## Overview
This update implements proper stage completion logging for reading plans with unique stage IDs, start time tracking, and persistent storage in Supabase.

## Features Added
- **Unique Stage IDs**: Each reading stage now has a unique ID generated from the reading reference
- **Start Time Tracking**: Records when a user begins reading a stage
- **Completion Logging**: Persists stage completions with user reflections
- **XP Award System**: Awards XP only for new completions (prevents duplicate awards)
- **Database Functions**: Dedicated functions for starting and completing stages
- **Progress Persistence**: Stage completions persist across sessions

## Files Modified

### 1. Database Schema (`supabase_reading_plan_stage_completion_v2.sql`)
- New `plan_stage_completions` table with stage ID support
- Functions: `start_plan_stage()`, `complete_plan_stage()`, `get_user_plan_stage_status()`
- Fixed SQL error in `plan_completion_stats` view
- Proper indexing and security policies

### 2. Frontend Code (`components/PlansView.tsx`)
- Added `generateStageId()` helper function
- Added `startStage()` and `completeStage()` functions
- Updated `loadCompletedStages()` to use stage IDs
- Modified `startReading()` to log stage start time
- Updated `handleCompleteObjective()` to use new completion system
- UI now shows completion status based on database records

## Setup Instructions

### Step 1: Run the SQL Migration
Execute the SQL file in your Supabase SQL Editor:
```sql
-- Run the contents of: supabase_reading_plan_stage_completion_v2.sql
```

### Step 2: Test the System
1. Start the development server: `npm run dev`
2. Navigate to Reading Plans
3. Begin a reading plan
4. Start a stage (logs start time)
5. Complete the stage with reflection (logs completion and awards XP)
6. Check that completion status persists after refresh

## Stage ID Generation
Stage IDs are automatically generated from reading references:
- "John 3:16" → "john_3_16"
- "Genesis 1:1-3" → "genesis_1_1_3"
- "Psalm 23" → "psalm_23"

## Database Schema

### plan_stage_completions Table
```sql
- id: UUID (primary key)
- user_id: UUID (references users)
- plan_id: text (plan identifier)
- stage_id: text (unique stage identifier)
- stage_number: int (stage order)
- stage_title: text (stage topic)
- reading_reference: text (bible reference)
- user_reflection: text (user's reflection)
- started_at: timestamp (when stage was started)
- completed_at: timestamp (when stage was completed)
- xp_awarded: int (XP awarded for completion)
```

### Functions
- `start_plan_stage()`: Logs when a user begins a stage
- `complete_plan_stage()`: Completes a stage and awards XP
- `get_user_plan_stage_status()`: Returns completion status for all stages

## Benefits
1. **Persistent Progress**: Stage completions survive app restarts
2. **Duplicate Prevention**: Prevents XP farming by completing same stage multiple times
3. **Detailed Tracking**: Records start times, completion times, and reflections
4. **Unique Identification**: Each stage has a unique ID regardless of plan structure
5. **Scalable Design**: Works with both predefined and custom forged plans

## Testing Checklist
- [ ] SQL migration runs without errors
- [ ] Stages can be started (start time logged)
- [ ] Stages can be completed (completion logged, XP awarded)
- [ ] Completion status persists after page refresh
- [ ] Duplicate completions don't award extra XP
- [ ] Custom forged plans work with the system
- [ ] UI correctly shows completion status

## Troubleshooting
If you encounter the SQL error "column p.plan_id does not exist", ensure you're using the v2 SQL file which fixes this issue in the view definition.
