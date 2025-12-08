-- ============================================================================
-- Migration: Add score columns to matches table
-- Created: 2025-12-08
-- Purpose: Store numeric match scores (e.g., 2:1) in addition to result type
-- ============================================================================

-- Add score columns to matches table
ALTER TABLE matches
  ADD COLUMN home_score smallint NULL,
  ADD COLUMN away_score smallint NULL;

-- Add comments for documentation
COMMENT ON COLUMN matches.home_score IS 'Number of goals scored by home team';
COMMENT ON COLUMN matches.away_score IS 'Number of goals scored by away team';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
