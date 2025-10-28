-- ============================================================================
-- Migration: Fix Performance Warnings
-- Created: 2025-10-28 12:02:00 UTC
-- Purpose: Optimize RLS policies and remove duplicate indexes
-- 
-- Issues fixed:
--   1. Auth RLS Initialization Plan - wrap auth.uid() in SELECT for better performance
--   2. Duplicate Indexes - PostgreSQL creates automatic indexes for UNIQUE constraints
--
-- Performance impact:
--   - RLS policies will evaluate auth.uid() once per query instead of per row
--   - Reduced index storage and maintenance overhead
-- ============================================================================

-- ============================================================================
-- SECTION 1: Drop Duplicate Indexes
-- ============================================================================
-- PostgreSQL automatically creates indexes for UNIQUE constraints with _key suffix
-- Our manually created indexes with _idx suffix are duplicates and can be dropped

-- ----------------------------------------------------------------------------
-- profiles table: Drop manually created username index
-- ----------------------------------------------------------------------------
-- Keep: profiles_username_key (auto-created by UNIQUE constraint)
-- Drop: profiles_username_idx (manually created duplicate)
drop index if exists public.profiles_username_idx;

-- ----------------------------------------------------------------------------
-- tournaments table: Drop manually created api_tournament_id index
-- ----------------------------------------------------------------------------
-- Keep: tournaments_api_tournament_id_key (auto-created by UNIQUE constraint)
-- Drop: tournaments_api_tournament_id_idx (manually created duplicate)
drop index if exists public.tournaments_api_tournament_id_idx;

-- ----------------------------------------------------------------------------
-- matches table: Drop manually created api_match_id index
-- ----------------------------------------------------------------------------
-- Keep: matches_api_match_id_key (auto-created by UNIQUE constraint)
-- Drop: matches_api_match_id_idx (manually created duplicate)
drop index if exists public.matches_api_match_id_idx;

-- ----------------------------------------------------------------------------
-- bets table: Drop manually created user_match index
-- ----------------------------------------------------------------------------
-- Keep: bets_user_id_match_id_key (auto-created by UNIQUE constraint)
-- Drop: bets_user_match_idx (manually created duplicate)
drop index if exists public.bets_user_match_idx;

-- ============================================================================
-- SECTION 2: Optimize RLS Policies - Fix Auth RLS Initialization Plan
-- ============================================================================
-- Wrap auth.uid() in SELECT to prevent re-evaluation for each row
-- This significantly improves query performance at scale

-- ----------------------------------------------------------------------------
-- profiles: Update RLS policies
-- ----------------------------------------------------------------------------

-- Drop existing policy
drop policy if exists "profiles_update_own" on public.profiles;

-- Recreate with optimized auth.uid() call
-- Changed: auth.uid() → (select auth.uid())
-- This ensures auth.uid() is evaluated once per query, not per row
create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- bets: Update RLS policies
-- ----------------------------------------------------------------------------

-- Drop existing policies
drop policy if exists "bets_select_own" on public.bets;
drop policy if exists "bets_insert_own" on public.bets;
drop policy if exists "bets_update_own" on public.bets;
drop policy if exists "bets_delete_own" on public.bets;

-- Recreate with optimized auth.uid() calls

-- SELECT policy: User can only read their own bets
create policy "bets_select_own" on public.bets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT policy: User can only create bets for themselves on scheduled matches >5 minutes away
create policy "bets_insert_own" on public.bets
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- UPDATE policy: User can only update their own bets on scheduled matches >5 minutes away
create policy "bets_update_own" on public.bets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- DELETE policy: User can only delete their own bets on scheduled matches >5 minutes away
create policy "bets_delete_own" on public.bets
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   - Dropped 4 duplicate indexes (profiles, tournaments, matches, bets)
--   - Optimized 5 RLS policies to use (select auth.uid())
--   - All Supabase linter warnings should now be resolved
--
-- Performance improvements:
--   - Reduced index storage and maintenance overhead
--   - auth.uid() now evaluated once per query instead of per row
--   - Better query plan optimization by PostgreSQL
-- ============================================================================
