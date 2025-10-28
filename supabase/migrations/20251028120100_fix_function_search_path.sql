-- ============================================================================
-- Migration: Fix Function Search Path Security Warning
-- Created: 2025-10-28 12:01:00 UTC
-- Purpose: Update functions to set search_path to empty string for security
-- 
-- Functions updated:
--   - handle_new_user: Set search_path = '' to prevent search_path attacks
--   - handle_updated_at: Set search_path = '' to prevent search_path attacks
--
-- References:
--   - https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Update handle_new_user function with secure search_path
-- ----------------------------------------------------------------------------
-- This fixes the security warning by explicitly setting search_path to empty string
-- Prevents potential search_path manipulation attacks
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

comment on function public.handle_new_user is 'Automatically creates profile when user signs up - secure search_path';

-- ----------------------------------------------------------------------------
-- Update handle_updated_at function with secure search_path
-- ----------------------------------------------------------------------------
-- This fixes the security warning by explicitly setting search_path to empty string
-- Prevents potential search_path manipulation attacks
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at is 'Automatically updates updated_at timestamp - secure search_path';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   - Updated handle_new_user with set search_path = ''
--   - Updated handle_updated_at with set search_path = ''
--   - Both functions now pass Supabase security linter checks
-- ============================================================================
