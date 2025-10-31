# MVP Endpoints Implementation Priority - betMate

## Core MVP Endpoints (Must Have)

### 1. Authentication Flow

While handled by Supabase Auth SDK client-side, you need:

- Profile auto-creation trigger (already in your migration)
- Session validation middleware (in `src/middleware/index.ts`)

### 2. Tournament Management

```
GET /api/tournaments
```

- **Why critical**: Users need to see available tournaments (Champions League, World Cup)
- **Priority**: HIGH - Required for navigation

### 3. Match Listing & Betting

```
GET /api/matches
GET /api/matches/:id
```

- **Why critical**: Users need to see upcoming matches to place bets
- **Priority**: HIGH - Core feature
- **Must include**: User's existing bet in response (the `user_bet` field)

### 4. Bet Management

```
POST /api/bets
PUT /api/bets/:id
GET /api/me/bets
```

- **Why critical**: This is the PRIMARY user action in your app
- **Priority**: CRITICAL - The entire app revolves around this
- **Note**: DELETE can be deferred to v2 if needed

### 5. Leaderboard

```
GET /api/tournaments/:tournament_id/leaderboard
```

- **Why critical**: Users need to see rankings (core motivation)
- **Priority**: HIGH - Key engagement feature

## Secondary Endpoints (Can Wait for v1.1)

### 6. Profile Display

```
GET /api/me/profile
GET /api/profiles/:username
```

- **Priority**: MEDIUM - Nice to have, but not blocking core flow
- **Can be deferred**: Yes, if you show username from session data initially

## Admin Endpoints (Background Jobs)

### 7. Data Sync (Supabase Edge Functions)

```
POST /api/admin/tournaments
POST /api/admin/matches
PUT /api/admin/matches/:id
POST /api/admin/score-matches
```

- **Priority**: HIGH - Required for data freshness
- **Implementation**: Can be Edge Functions rather than REST endpoints
- **Schedule**: Sync matches hourly, score every 2 hours

---

## Recommended Implementation Order

### Phase 1: Core Betting Flow

1. ✅ **Database migrations** (already done)
2. ✅ **Middleware** for auth validation
3. **GET /api/tournaments** - List tournaments
4. **GET /api/matches?tournament_id=X** - List matches with user bets
5. **POST /api/bets** - Place bet
6. **PUT /api/bets/:id** - Update bet

**Test Milestone**: User can register → see tournaments → see matches → place/edit bet

### Phase 2: Engagement Features

7. **GET /api/tournaments/:id/leaderboard** - View rankings
8. **GET /api/me/bets** - View user's bet history

**Test Milestone**: User can see their ranking and bet history

### Phase 3: Data Pipeline

9. **Edge Function**: Sync matches from api-football.com (hourly)
10. **Edge Function**: Calculate scores (every 2 hours)

**Test Milestone**: Matches update automatically, points calculated correctly

### Phase 4: Polish (v1.1)

11. **GET /api/me/profile** - User profile
12. **GET /api/profiles/:username** - Public profiles
13. **DELETE /api/bets/:id** - Delete bets
14. **GET /api/matches/:id** - Single match detail

---

## Minimal Viable Implementation

If you want to launch **as fast as possible**, you can start with just:

1. **GET /api/tournaments** (hardcoded 2 tournaments initially)
2. **GET /api/matches** with `?tournament_id` filter
3. **POST /api/bets**
4. **PUT /api/bets/:id**
5. **GET /api/tournaments/:id/leaderboard**

This gives users the complete flow:

- See tournaments → See matches → Place bets → View ranking

Then add the Edge Functions for automation in a second deploy.

---

## Critical Implementation Notes

### For `/api/matches`

Must include the authenticated user's bet in the response:

```typescript
// Join with bets table filtered by auth.uid()
const { data } = await supabase
  .from("matches")
  .select(
    `
    *,
    user_bet:bets!bets_match_id_fkey(
      id, picked_result, created_at, updated_at
    )
  `
  )
  .eq("bets.user_id", userId)
  .eq("tournament_id", tournamentId)
  .order("match_datetime");
```

### For `/api/bets` POST/PUT

RLS policies will automatically enforce the 5-minute rule - you just need to:

1. Validate request body with Zod
2. Try to insert/update via Supabase client
3. Handle RLS policy violations as `403 Forbidden` responses

### Error Handling Pattern

Follow the architecture pattern from `CLAUDE.md`:

```typescript
// Handle errors first (guard clauses)
if (!matchId) {
  return new Response(JSON.stringify({ error: "Match ID required" }), {
    status: 400
  });
}

if (!user) {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401
  });
}

// Happy path last
const { data, error } = await supabase
  .from('bets')
  .insert({ ... });

if (error) {
  // Handle specific errors
  if (error.code === '23505') { // Unique violation
    return new Response(JSON.stringify({
      error: "Bet already exists for this match"
    }), { status: 409 });
  }

  // Generic error
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500
  });
}

return new Response(JSON.stringify({ data }), {
  status: 201,
  headers: { Location: `/api/bets/${data.id}` }
});
```

---

## Next Steps

1. Start with Phase 1 endpoints in order
2. Create implementation plan for each endpoint using `plan-implementacji-endpointa-rest-api.md` template
3. Implement endpoints one by one
4. Test each phase milestone before moving to next phase
5. Deploy and monitor

---

## Reference Documents

- **API Specification**: `.ai/api-plan.md`
- **Database Schema**: `.ai/db-plan.md`
- **Architecture Guidelines**: `CLAUDE.md`
- **Implementation Template**: `.planning/plan-implementacji-endpointa-rest-api.md`
