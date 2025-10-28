-- ============================================================================
-- Migration: Initial Schema for betMate MVP
-- Created: 2025-10-28 12:00:00 UTC
-- Purpose: Create complete database schema for betting application
-- 
-- Tables created:
--   - profiles: User public profiles (1:1 with auth.users)
--   - tournaments: Tournament information
--   - matches: Match data with status and results
--   - bets: User predictions on matches
--   - scores: Denormalized points and rankings
--
-- Features:
--   - Row Level Security (RLS) enabled on all tables
--   - Automatic profile creation on user signup
--   - Automatic updated_at timestamps
--   - Integration with Supabase Auth
-- ============================================================================

-- ============================================================================
-- SECTION 1: Custom Types (ENUM)
-- ============================================================================

-- match_outcome: possible results of a match
-- used in matches.result and bets.picked_result
create type match_outcome as enum ('HOME_WIN', 'DRAW', 'AWAY_WIN');

-- match_status: lifecycle states of a match
-- used in matches.status
create type match_status as enum ('SCHEDULED', 'IN_PLAY', 'FINISHED', 'POSTPONED', 'CANCELED');

-- ============================================================================
-- SECTION 2: Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: Public user profiles (extends auth.users)
-- ----------------------------------------------------------------------------
-- Purpose: Store public user data separated from authentication data
-- Relationship: 1:1 with auth.users (id references auth.users.id)
-- Notes: 
--   - Created automatically via trigger when user signs up
--   - Username is extracted from raw_user_meta_data during signup
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

-- Index for efficient username lookups
create unique index profiles_username_idx on profiles(username);

-- Add helpful comment to the table
comment on table profiles is 'Public user profiles with 1:1 relationship to auth.users';
comment on column profiles.id is 'Foreign key to auth.users.id - user identifier';
comment on column profiles.username is 'Unique username chosen during registration';

-- ----------------------------------------------------------------------------
-- tournaments: Tournament/competition data
-- ----------------------------------------------------------------------------
-- Purpose: Store tournament information fetched from external API
-- Notes:
--   - api_tournament_id is unique identifier from api-football.com
--   - Only service_role can modify this table
create table tournaments (
  id bigint primary key generated always as identity,
  name text not null,
  api_tournament_id bigint unique
);

-- Index for API lookups
create unique index tournaments_api_tournament_id_idx on tournaments(api_tournament_id);

comment on table tournaments is 'Tournament/competition information from external API';
comment on column tournaments.api_tournament_id is 'External API identifier for the tournament';

-- ----------------------------------------------------------------------------
-- matches: Match data with status and results
-- ----------------------------------------------------------------------------
-- Purpose: Store match information including teams, datetime, status, and results
-- Notes:
--   - match_datetime stored in UTC for consistency
--   - result is NULL until match is finished
--   - is_scored flag prevents duplicate point calculations
--   - Only service_role can modify this table
create table matches (
  id bigint primary key generated always as identity,
  tournament_id bigint not null references tournaments(id),
  home_team text not null,
  away_team text not null,
  match_datetime timestamptz not null,
  status match_status not null,
  result match_outcome null,
  api_match_id bigint unique,
  is_scored boolean not null default false
);

-- Indexes for common queries
create index matches_tournament_id_idx on matches(tournament_id);
create index matches_match_datetime_idx on matches(match_datetime);
create index matches_status_idx on matches(status);
create unique index matches_api_match_id_idx on matches(api_match_id);
-- Index for scoring edge function to find unscored finished matches
create index matches_is_scored_idx on matches(is_scored);

comment on table matches is 'Match data including teams, datetime, status, and results';
comment on column matches.match_datetime is 'Match start time in UTC timezone';
comment on column matches.result is 'Actual match outcome - NULL until match is finished';
comment on column matches.is_scored is 'Flag indicating if points have been calculated for this match';

-- ----------------------------------------------------------------------------
-- bets: User predictions on matches
-- ----------------------------------------------------------------------------
-- Purpose: Store user bets/predictions on match outcomes
-- Constraints:
--   - One bet per user per match (unique constraint)
--   - User can only bet on matches starting in >5 minutes (enforced by RLS)
--   - Bets can be modified/deleted until 5 minutes before match starts
-- Notes:
--   - updated_at is automatically set by trigger
--   - Cascade delete when user is deleted from profiles
create table bets (
  id bigint primary key generated always as identity,
  user_id uuid not null references profiles(id) on delete cascade,
  match_id bigint not null references matches(id),
  picked_result match_outcome not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  -- One bet per user per match
  unique(user_id, match_id)
);

-- Indexes for common queries
create index bets_user_id_idx on bets(user_id);
create index bets_match_id_idx on bets(match_id);
create unique index bets_user_match_idx on bets(user_id, match_id);

comment on table bets is 'User predictions on match outcomes';
comment on column bets.picked_result is 'User prediction for match outcome';
comment on column bets.updated_at is 'Timestamp of last modification - set automatically by trigger';

-- ----------------------------------------------------------------------------
-- scores: Denormalized points and rankings
-- ----------------------------------------------------------------------------
-- Purpose: Store aggregated user points per tournament for efficient ranking queries
-- Design: 
--   - Denormalized table to avoid expensive aggregations
--   - Updated by edge function after each finished match
--   - Composite primary key (user_id, tournament_id)
-- Notes:
--   - Only service_role can modify this table
--   - Public read access for all authenticated users (leaderboards)
create table scores (
  user_id uuid not null references profiles(id) on delete cascade,
  tournament_id bigint not null references tournaments(id),
  points int not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, tournament_id)
);

-- Index for efficient ranking queries (order by points desc)
create index scores_tournament_id_idx on scores(tournament_id);
create index scores_points_idx on scores(points);

comment on table scores is 'Denormalized user points per tournament for efficient rankings';
comment on column scores.points is 'Total points accumulated by user in tournament';
comment on column scores.updated_at is 'Timestamp of last point calculation - set automatically by trigger';

-- ============================================================================
-- SECTION 3: Row-Level Security (RLS) Policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: RLS Policies
-- ----------------------------------------------------------------------------
-- Security model:
--   - All authenticated users can view all profiles (for leaderboards, etc.)
--   - Users can only update their own profile
alter table profiles enable row level security;

-- Allow authenticated users to read all profiles
-- Rationale: Public profiles needed for leaderboards and user lists
create policy "profiles_select_authenticated" on profiles
  for select
  to authenticated
  using (true);

-- Allow users to update only their own profile
-- Rationale: Users should only modify their own data
create policy "profiles_update_own" on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- tournaments: RLS Policies
-- ----------------------------------------------------------------------------
-- Security model:
--   - All authenticated users can view tournaments
--   - Only service_role can modify (inserts/updates/deletes handled by backend)
alter table tournaments enable row level security;

-- Allow authenticated users to read all tournaments
-- Rationale: Tournament list is public information for all users
create policy "tournaments_select_authenticated" on tournaments
  for select
  to authenticated
  using (true);

-- Note: Insert/update/delete policies not needed - handled by service_role

-- ----------------------------------------------------------------------------
-- matches: RLS Policies
-- ----------------------------------------------------------------------------
-- Security model:
--   - All authenticated users can view matches
--   - Only service_role can modify (inserts/updates/deletes handled by backend)
alter table matches enable row level security;

-- Allow authenticated users to read all matches
-- Rationale: Match schedule and results are public information
create policy "matches_select_authenticated" on matches
  for select
  to authenticated
  using (true);

-- Note: Insert/update/delete policies not needed - handled by service_role

-- ----------------------------------------------------------------------------
-- bets: RLS Policies
-- ----------------------------------------------------------------------------
-- Security model:
--   - Users can only view their own bets
--   - Users can only create/modify/delete bets for matches starting >5 minutes from now
--   - Bets can only be placed/modified for SCHEDULED matches
alter table bets enable row level security;

-- Allow users to read only their own bets
-- Rationale: Bets are private - users should not see other users' predictions
create policy "bets_select_own" on bets
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow users to insert bets only for themselves and for matches starting >5 minutes from now
-- Rationale: 
--   - Prevent betting on matches that are about to start or already started
--   - Ensure users can only create bets for themselves
create policy "bets_insert_own" on bets
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- Allow users to update only their own bets for matches starting >5 minutes from now
-- Rationale: 
--   - Allow users to change their predictions before match starts
--   - Prevent modifications too close to match start time
create policy "bets_update_own" on bets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- Allow users to delete only their own bets for matches starting >5 minutes from now
-- Rationale: 
--   - Allow users to withdraw predictions before match starts
--   - Prevent deletions too close to match start time
create policy "bets_delete_own" on bets
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.match_datetime > (now() + interval '5 minutes')
      and matches.status = 'SCHEDULED'
    )
  );

-- ----------------------------------------------------------------------------
-- scores: RLS Policies
-- ----------------------------------------------------------------------------
-- Security model:
--   - All authenticated users can view all scores (for public leaderboards)
--   - Only service_role can modify (points calculated by edge function)
alter table scores enable row level security;

-- Allow authenticated users to read all scores
-- Rationale: Leaderboards are public - all users should see rankings
create policy "scores_select_authenticated" on scores
  for select
  to authenticated
  using (true);

-- Note: Insert/update/delete policies not needed - handled by service_role

-- ============================================================================
-- SECTION 4: Triggers and Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: handle_new_user
-- Purpose: Automatically create profile when user signs up via Supabase Auth
-- ----------------------------------------------------------------------------
-- This function is triggered after insert on auth.users
-- It creates a corresponding profile record in public.profiles
-- Username is extracted from raw_user_meta_data (passed during signup)
-- If username is not provided, generates one from user id
-- SECURITY DEFINER allows function to insert into profiles table
-- search_path set to empty string for security (prevents search_path attacks)
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

-- Trigger: Execute handle_new_user after user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user is 'Automatically creates profile when user signs up';

-- ----------------------------------------------------------------------------
-- Function: handle_updated_at
-- Purpose: Automatically update updated_at timestamp on row modification
-- ----------------------------------------------------------------------------
-- Generic function to set updated_at to current timestamp
-- Used by multiple tables (bets, scores)
-- search_path set to empty string for security (prevents search_path attacks)
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

-- Trigger: Set updated_at on bets update
create trigger set_updated_at_bets
  before update on bets
  for each row execute function public.handle_updated_at();

-- Trigger: Set updated_at on scores update
create trigger set_updated_at_scores
  before update on scores
  for each row execute function public.handle_updated_at();

comment on function public.handle_updated_at is 'Automatically updates updated_at timestamp on row modification';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   - Created 2 custom types (match_outcome, match_status)
--   - Created 5 tables (profiles, tournaments, matches, bets, scores)
--   - Enabled RLS on all tables with appropriate policies
--   - Created automatic profile creation trigger
--   - Created automatic updated_at triggers
--   - Added indexes for query optimization
--   - Added helpful comments throughout
--
-- Next steps:
--   - Populate tournaments table with initial data
--   - Create edge function for point calculation (runs every 2 hours)
--   - Set up frontend authentication flow
-- ============================================================================
