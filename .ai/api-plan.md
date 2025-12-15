# REST API Plan - betMate MVP

## 1. Resources

This API design follows REST principles and is built on Astro 5 server-side rendering with Supabase backend integration.

| Resource        | Database Table | Description                                             |
| --------------- | -------------- | ------------------------------------------------------- |
| **Tournaments** | `tournaments`  | Football tournaments (Champions League, World Cup 2026) |
| **Matches**     | `matches`      | Individual matches within tournaments                   |
| **Bets**        | `bets`         | User predictions for match outcomes                     |
| **Leaderboard** | `scores`       | Tournament rankings with user points                    |
| **Profile**     | `profiles`     | Public user profile information                         |

## 2. Endpoints

### 2.1 Authentication

Authentication is handled through **Supabase Auth SDK** on the client side, with one server-side endpoint for username validation. The API expects all requests to include a valid session token in the Authorization header.

**Session Management:**

- Sessions are validated via Astro middleware (`src/middleware/index.ts`)
- Authenticated user ID is available via `context.locals.supabase.auth.getUser()`
- All endpoints below require authentication unless explicitly marked as public

**Client-Side Auth Operations:**

```typescript
// Registration - two-step process:
// 1. Check username availability (server-side)
// 2. Create account via Supabase Auth
const checkResponse = await fetch('/api/auth/check-username', {
  method: 'POST',
  body: JSON.stringify({ username }),
});
if (checkResponse.ok && (await checkResponse.json()).available) {
  supabase.auth.signUp({
    email: string,
    password: string,
    options: {
      data: { username: string },
    },
  });
}

// Login - handled by Supabase Auth
supabase.auth.signInWithPassword({
  email: string,
  password: string,
});

// Logout - handled by Supabase Auth
supabase.auth.signOut();
```

---

#### POST /api/auth/check-username

**Description:** Check if a username is available for registration. Required to fulfill US-001 requirement: "System weryfikuje, czy nazwa użytkownika nie jest już zajęta."

**Authentication:** Not required (public endpoint for registration flow)

**Request Body:**

```json
{
  "username": "johndoe"
}
```

**Validation Rules:**

- `username`: Required, minimum 3 characters

**Response Body (Success):**

```json
{
  "available": true
}
```

**Response Body (Username taken):**

```json
{
  "available": false,
  "message": "Nazwa użytkownika jest już zajęta"
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 400 Bad Request
  - **Message:** `{ "available": false, "message": "Nazwa użytkownika musi mieć co najmniej 3 znaki" }`

**Implementation Notes:**

- Queries `profiles` table with UNIQUE constraint on `username`
- Case-insensitive comparison recommended for better UX
- Should be called before `signUp()` in registration flow

### 2.2 Tournaments

#### GET /api/tournaments

**Description:** Retrieve list of all available tournaments.

**Authentication:** Required

**Query Parameters:** None

**Response Body:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "UEFA Champions League",
      "api_tournament_id": 2
    },
    {
      "id": 2,
      "name": "FIFA World Cup 2026",
      "api_tournament_id": 1
    }
  ]
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`

---

#### GET /api/tournaments/:id

**Description:** Get details of a specific tournament.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Tournament ID

**Response Body:**

```json
{
  "data": {
    "id": 1,
    "name": "UEFA Champions League",
    "api_tournament_id": 2
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Tournament not found" }`

---

### 2.3 Matches

#### GET /api/matches

**Description:** Retrieve list of matches with optional filtering.

**Authentication:** Required

**Query Parameters:**

- `tournament_id` (optional): Filter by tournament ID
- `status` (optional): Filter by match status (`SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`)
- `from_date` (optional): Filter matches after this date (ISO 8601 format)
- `to_date` (optional): Filter matches before this date (ISO 8601 format)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response Body:**

```json
{
  "data": [
    {
      "id": 101,
      "tournament_id": 1,
      "home_team": "Real Madrid",
      "away_team": "Barcelona",
      "match_datetime": "2025-11-15T20:00:00Z",
      "status": "SCHEDULED",
      "result": null,
      "api_match_id": 12345,
      "user_bet": null
    },
    {
      "id": 102,
      "tournament_id": 1,
      "home_team": "Bayern Munich",
      "away_team": "Manchester City",
      "match_datetime": "2025-11-16T19:45:00Z",
      "status": "SCHEDULED",
      "result": null,
      "api_match_id": 12346,
      "user_bet": {
        "id": 501,
        "picked_result": "HOME_WIN",
        "created_at": "2025-11-10T14:30:00Z",
        "updated_at": null
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

**Note:** The `user_bet` field is included when the authenticated user has placed a bet on that match.

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 400 Bad Request
  - **Message:** `{ "error": "Invalid query parameters", "details": [...] }`

---

#### GET /api/matches/:id

**Description:** Get details of a specific match including the authenticated user's bet if exists.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Match ID

**Response Body:**

```json
{
  "data": {
    "id": 101,
    "tournament_id": 1,
    "home_team": "Real Madrid",
    "away_team": "Barcelona",
    "match_datetime": "2025-11-15T20:00:00Z",
    "status": "SCHEDULED",
    "result": null,
    "api_match_id": 12345,
    "can_bet": true,
    "betting_closes_at": "2025-11-15T19:55:00Z",
    "user_bet": {
      "id": 501,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null
    }
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Match not found" }`

---

### 2.4 Bets

#### GET /api/me/bets

**Description:** Retrieve all bets for the authenticated user.

**Authentication:** Required

**Query Parameters:**

- `tournament_id` (optional): Filter bets by tournament
- `match_id` (optional): Filter bet for specific match
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response Body:**

```json
{
  "data": [
    {
      "id": 501,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "match_id": 101,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null,
      "match": {
        "id": 101,
        "tournament_id": 1,
        "home_team": "Real Madrid",
        "away_team": "Barcelona",
        "match_datetime": "2025-11-15T20:00:00Z",
        "status": "SCHEDULED",
        "result": null
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`

---

#### POST /api/bets

**Description:** Create a new bet for a match. Only one bet per user per match is allowed.

**Authentication:** Required

**Request Body:**

```json
{
  "match_id": 101,
  "picked_result": "HOME_WIN"
}
```

**Validation Rules:**

- `match_id`: Required, must reference an existing match
- `picked_result`: Required, must be one of: `HOME_WIN`, `DRAW`, `AWAY_WIN`
- Match must have status `SCHEDULED`
- Match must start more than 5 minutes from now
- User cannot already have a bet on this match

**Response Body:**

```json
{
  "data": {
    "id": 501,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "HOME_WIN",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": null
  }
}
```

**Success Response:**

- **Code:** 201 Created
  - **Headers:** `Location: /api/bets/501`

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 400 Bad Request
  - **Message:** `{ "error": "Invalid request body", "details": [...] }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot bet on this match", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 409 Conflict
  - **Message:** `{ "error": "Bet already exists for this match" }`

---

#### PUT /api/bets/:id

**Description:** Update an existing bet. Only allowed if match hasn't started and is more than 5 minutes away.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Bet ID

**Request Body:**

```json
{
  "picked_result": "DRAW"
}
```

**Validation Rules:**

- `picked_result`: Required, must be one of: `HOME_WIN`, `DRAW`, `AWAY_WIN`
- Bet must belong to authenticated user
- Associated match must have status `SCHEDULED`
- Associated match must start more than 5 minutes from now

**Response Body:**

```json
{
  "data": {
    "id": 501,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "DRAW",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": "2025-11-11T10:15:00Z"
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot modify this bet", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Bet not found" }`

---

#### DELETE /api/bets/:id

**Description:** Delete an existing bet. Only allowed if match hasn't started and is more than 5 minutes away.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Bet ID

**Validation Rules:**

- Bet must belong to authenticated user
- Associated match must have status `SCHEDULED`
- Associated match must start more than 5 minutes from now

**Response Body:**

```json
{
  "message": "Bet deleted successfully"
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot delete this bet", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Bet not found" }`

---

### 2.5 Leaderboard

#### GET /api/tournaments/:tournament_id/leaderboard

**Description:** Retrieve the public leaderboard (rankings) for a specific tournament.

**Authentication:** Required

**URL Parameters:**

- `tournament_id` (required): Tournament ID

**Query Parameters:**

- `limit` (optional): Number of results per page (default: 100, max: 500)
- `offset` (optional): Pagination offset (default: 0)

**Response Body:**

```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "johndoe",
      "points": 45
    },
    {
      "rank": 2,
      "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "username": "janedoe",
      "points": 42
    },
    {
      "rank": 3,
      "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "username": "bobsmith",
      "points": 38
    },
    {
      "rank": 3,
      "user_id": "d4e5f6a7-b8c9-0123-def1-234567890123",
      "username": "alicejones",
      "points": 38
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 100,
    "offset": 0,
    "has_more": true
  },
  "tournament": {
    "id": 1,
    "name": "UEFA Champions League"
  }
}
```

**Note:** Users with the same points share the same rank.

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Tournament not found" }`

---

### 2.6 Profile

#### GET /api/me/profile

**Description:** Get the profile of the authenticated user.

**Authentication:** Required

**Response Body:**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "johndoe",
    "created_at": "2025-10-01T12:00:00Z"
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`

---

#### GET /api/profiles/:username

**Description:** Get public profile information by username.

**Authentication:** Required

**URL Parameters:**

- `username` (required): Username to look up

**Response Body:**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "johndoe",
    "created_at": "2025-10-01T12:00:00Z",
    "stats": [
      {
        "tournament_id": 1,
        "tournament_name": "UEFA Champions League",
        "points": 45,
        "rank": 1
      }
    ]
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Profile not found" }`

---

### 2.7 Admin Endpoints (Service Role Only)

These endpoints are only accessible with Supabase service role credentials and are used for administrative tasks and background jobs.

#### POST /api/admin/tournaments

**Description:** Create a new tournament (called by sync script fetching from api-football.com).

**Authentication:** Service Role Required

**Request Body:**

```json
{
  "name": "UEFA Champions League",
  "api_tournament_id": 2
}
```

**Response Body:**

```json
{
  "data": {
    "id": 1,
    "name": "UEFA Champions League",
    "api_tournament_id": 2
  }
}
```

**Success Response:**

- **Code:** 201 Created

---

#### POST /api/admin/matches

**Description:** Create a new match (called by sync script fetching from api-football.com).

**Authentication:** Service Role Required

**Request Body:**

```json
{
  "tournament_id": 1,
  "home_team": "Real Madrid",
  "away_team": "Barcelona",
  "match_datetime": "2025-11-15T20:00:00Z",
  "status": "SCHEDULED",
  "api_match_id": 12345
}
```

**Response Body:**

```json
{
  "data": {
    "id": 101,
    "tournament_id": 1,
    "home_team": "Real Madrid",
    "away_team": "Barcelona",
    "match_datetime": "2025-11-15T20:00:00Z",
    "status": "SCHEDULED",
    "result": null,
    "api_match_id": 12345,
    "is_scored": false
  }
}
```

**Success Response:**

- **Code:** 201 Created

---

#### PUT /api/admin/matches/:id

**Description:** Update match details including result (called by sync script and scoring function).

**Authentication:** Service Role Required

**URL Parameters:**

- `id` (required): Match ID

**Request Body:**

```json
{
  "status": "FINISHED",
  "result": "HOME_WIN",
  "is_scored": true
}
```

**Response Body:**

```json
{
  "data": {
    "id": 101,
    "tournament_id": 1,
    "home_team": "Real Madrid",
    "away_team": "Barcelona",
    "match_datetime": "2025-11-15T20:00:00Z",
    "status": "FINISHED",
    "result": "HOME_WIN",
    "api_match_id": 12345,
    "is_scored": true
  }
}
```

**Success Response:**

- **Code:** 200 OK

---

#### POST /api/admin/score-matches

**Description:** Manually trigger the scoring function for finished matches (primarily for testing; normally runs via Edge Function cron job).

**Authentication:** Service Role Required

**Request Body:**

```json
{
  "dry_run": false
}
```

**Response Body:**

```json
{
  "data": {
    "processed_matches": 5,
    "updated_scores": 12,
    "errors": []
  }
}
```

**Success Response:**

- **Code:** 200 OK

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Supabase Auth** is used for all authentication operations:

1. **Registration & Login:** Handled entirely on the client side using Supabase Auth SDK
2. **Session Management:** JWT tokens stored in cookies, validated by Astro middleware
3. **Token Refresh:** Automatically handled by Supabase SDK
4. **Password Reset:** Handled by Supabase Auth email flows

### 3.2 Request Authentication

All API requests (except Supabase Auth endpoints) must include authentication:

**Headers:**

```
Authorization: Bearer <supabase_access_token>
```

The Astro middleware (`src/middleware/index.ts`) extracts and validates the token:

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();

if (error || !user) {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
  });
}

// Attach user to context for use in API routes
context.locals.user = user;
```

### 3.3 Authorization Levels

**1. Authenticated Users (auth.uid() available):**

- Can read: all tournaments, matches, profiles, leaderboards
- Can manage: only their own bets
- Row-Level Security (RLS) enforces user-specific access

**2. Service Role (service_role key):**

- Full access to all tables
- Can bypass RLS policies
- Used by background jobs and admin scripts
- Never exposed to frontend

### 3.4 Row-Level Security (RLS)

All data access goes through Supabase RLS policies:

**Profiles:**

- Read: All authenticated users
- Update: Only own profile

**Tournaments & Matches:**

- Read: All authenticated users
- Modify: Service role only

**Bets:**

- Read: Only own bets (`auth.uid() = user_id`)
- Create/Update/Delete: Only own bets with time validation
  - Match must be `SCHEDULED`
  - Match must start > 5 minutes from now

**Scores:**

- Read: All authenticated users (public leaderboard)
- Modify: Service role only

### 3.5 Security Best Practices

1. **Never expose service_role key** to frontend
2. **All sensitive operations** go through RLS-protected tables
3. **Validate input** at both API and database levels using Zod schemas
4. **Use prepared statements** (Supabase client handles this automatically)
5. **Rate limiting** should be implemented at the API gateway/middleware level (not in MVP but recommended for production)
6. **CORS configuration** should restrict origins to known domains in production

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profiles (Registration)

**Field Validation:**

- `email`: Required, valid email format, unique in auth.users
- `password`: Required, minimum 8 characters (Supabase Auth default)
- `username`: Required, 3-20 alphanumeric characters plus underscores, unique in profiles table

**Database Constraints:**

- `profiles.username`: NOT NULL, UNIQUE
- `profiles.id`: Must reference existing auth.users.id

**Implementation:** Validation occurs at both Supabase Auth level and database constraint level.

---

#### Bets

**Field Validation:**

- `match_id`: Required, must reference existing match
- `picked_result`: Required, must be enum value (`HOME_WIN`, `DRAW`, `AWAY_WIN`)

**Business Rule Validation:**

1. **Time Lock:** Match must start more than 5 minutes from now
2. **Match Status:** Match must have status `SCHEDULED`
3. **One Bet Per Match:** Unique constraint on (user_id, match_id)
4. **Ownership:** User can only create/modify their own bets

**RLS Policy Enforcement:**

```sql
-- From bets_insert_own policy
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_id
    AND matches.match_datetime > (now() + interval '5 minutes')
    AND matches.status = 'SCHEDULED'
  )
)
```

**Error Scenarios:**

- Bet too late: 403 Forbidden with message about 5-minute rule
- Duplicate bet: 409 Conflict suggesting to update existing bet
- Invalid match_id: 400 Bad Request
- Invalid picked_result: 400 Bad Request with enum values list

---

#### Matches (Admin only)

**Field Validation:**

- `tournament_id`: Required, must reference existing tournament
- `home_team`: Required, non-empty string
- `away_team`: Required, non-empty string
- `match_datetime`: Required, valid ISO 8601 timestamp
- `status`: Required, must be enum value (`SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`)
- `result`: Optional, must be enum value (`HOME_WIN`, `DRAW`, `AWAY_WIN`) if status is `FINISHED`
- `api_match_id`: Optional, unique if provided

**Business Rules:**

- New matches should have `match_datetime` in the future
- `result` should be NULL unless status is `FINISHED`
- Cannot change status from `FINISHED` back to `SCHEDULED`

---

### 4.2 Business Logic Implementation

#### BL-1: Bet Creation with Time Validation

**Flow:**

1. User submits POST /api/bets with `match_id` and `picked_result`
2. API validates request body with Zod schema
3. Request forwarded to Supabase client
4. RLS policy `bets_insert_own` validates:
   - User is creating bet for themselves
   - Match exists and starts > 5 minutes from now
   - Match status is `SCHEDULED`
5. Database checks unique constraint on (user_id, match_id)
6. If all validations pass, bet is created
7. API returns 201 Created with bet details

**Error Handling:**

- If time validation fails: 403 Forbidden
- If duplicate constraint fails: 409 Conflict
- If match not found: 400 Bad Request (FK violation)

---

#### BL-2: Leaderboard Calculation

**Query Logic:**

```sql
SELECT
  s.user_id,
  p.username,
  s.points,
  RANK() OVER (ORDER BY s.points DESC) as rank
FROM scores s
JOIN profiles p ON s.user_id = p.id
WHERE s.tournament_id = :tournament_id
ORDER BY s.points DESC, p.username ASC
LIMIT :limit OFFSET :offset
```

**Ranking Rules:**

- Users with equal points share the same rank
- Next rank after tie is calculated correctly (e.g., two users at rank 3, next is rank 5)
- Secondary sort by username for consistent ordering within same rank

**Implementation:** Use PostgreSQL `RANK()` window function to handle ties properly.

---

#### BL-3: Automatic Scoring (Edge Function)

**Trigger:** Supabase Edge Function running every 2 hours (cron job)

**Algorithm:**

```
1. SELECT matches WHERE status = 'FINISHED' AND is_scored = FALSE
2. FOR EACH unscored_match:
   a. Get match.result
   b. SELECT bets WHERE match_id = unscored_match.id
   c. FOR EACH bet:
      - Compare bet.picked_result with match.result
      - IF match: points_to_add = 1
      - ELSE: points_to_add = 0
      - UPSERT INTO scores (user_id, tournament_id, points)
        VALUES (bet.user_id, match.tournament_id, points_to_add)
        ON CONFLICT (user_id, tournament_id)
        DO UPDATE SET points = scores.points + points_to_add
   d. UPDATE matches SET is_scored = TRUE WHERE id = unscored_match.id
3. COMMIT transaction
```

**Error Handling:**

- Each match processed in separate transaction for isolation
- Failed match scoring logged but doesn't block other matches
- Retried on next cron run (is_scored still FALSE)

**Edge Cases:**

- Matches with status `POSTPONED` or `CANCELED`: Ignored (not processed)
- Matches without result set: Ignored until result available
- Bets on canceled matches: Not deleted, just never scored

---

#### BL-4: Match Data Synchronization (Edge Function)

**Trigger:** Supabase Edge Function running every hour

**Flow:**

1. Call api-football.com API to fetch latest match data
2. For each tournament being tracked:
   - Fetch upcoming and recent matches
   - UPSERT matches based on api_match_id
   - Update status and result for existing matches
3. Handle rate limiting from external API (respect limits)

**Data Mapping:**

```
api-football.com → betMate database
- fixture.id → api_match_id
- fixture.status.short → status (mapped to enum)
- teams.home.winner → result calculation (HOME_WIN/DRAW/AWAY_WIN)
- fixture.timestamp → match_datetime (convert to UTC)
```

---

#### BL-5: Canceled/Postponed Match Handling

**When match status changes to POSTPONED or CANCELED:**

1. Match status updated via sync function
2. Existing bets remain in database (not deleted)
3. Scoring function ignores these matches (never sets is_scored = TRUE)
4. Frontend displays match with appropriate status indicator
5. If match is rescheduled:
   - Status changes back to SCHEDULED
   - New match_datetime is set
   - Existing bets remain valid if still > 5 minutes before new time
   - Users can modify bets if time lock allows

**No points awarded or deducted for canceled/postponed matches.**

---

### 4.3 Data Integrity

**Database-Level Constraints:**

1. Foreign key constraints prevent orphaned records
2. Unique constraints prevent duplicate bets per user per match
3. NOT NULL constraints ensure required fields are always present
4. CHECK constraints ensure points are non-negative
5. Enum types ensure status and result values are valid

**Application-Level Validation:**

1. Zod schemas validate request bodies before database interaction
2. Early returns for invalid states (guard clauses pattern)
3. Proper error messages guide users to correct issues

**Transaction Management:**

1. Supabase client handles transactions automatically
2. Scoring function uses explicit transactions for atomicity
3. Multi-step operations (e.g., user registration + profile creation) use triggers for consistency

---

## 5. API Conventions

### 5.1 HTTP Methods

- **GET:** Retrieve resources (idempotent)
- **POST:** Create new resources (non-idempotent)
- **PUT:** Update existing resources (idempotent)
- **DELETE:** Remove resources (idempotent)

### 5.2 Response Format

**Success Response Structure:**

```json
{
  "data": {
    /* resource or array of resources */
  },
  "pagination": {
    /* optional, for list endpoints */
  },
  "meta": {
    /* optional, additional metadata */
  }
}
```

**Error Response Structure:**

```json
{
  "error": "Human-readable error message",
  "details": [
    /* optional, validation errors */
  ],
  "code": "ERROR_CODE" /* optional, machine-readable code */
}
```

### 5.3 Status Codes

- **200 OK:** Successful GET, PUT, DELETE
- **201 Created:** Successful POST (resource created)
- **400 Bad Request:** Invalid request body or parameters
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Authenticated but not authorized (e.g., time lock)
- **404 Not Found:** Resource doesn't exist
- **409 Conflict:** Resource already exists (duplicate)
- **500 Internal Server Error:** Unexpected server error

### 5.4 Pagination

**Query Parameters:**

- `limit`: Number of items per page (default varies by endpoint)
- `offset`: Number of items to skip

**Response Metadata:**

```json
"pagination": {
  "total": 250,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

### 5.5 Filtering and Sorting

**Filtering:** Use query parameters matching field names

- Example: `/api/matches?tournament_id=1&status=SCHEDULED`

**Sorting:** Use `sort` and `order` query parameters (if implemented)

- Example: `/api/tournaments/1/leaderboard?sort=points&order=desc`
- Default: Leaderboards always sorted by points DESC

### 5.6 Timestamps

All timestamps use **ISO 8601 format** in UTC timezone:

- Example: `2025-11-15T20:00:00Z`
- Client responsible for converting to local timezone for display

### 5.7 Versioning

Not implemented in MVP. Future API versions can use URL path versioning:

- `/api/v1/matches`
- `/api/v2/matches`

---

## 6. Implementation Notes

### 6.1 Technology Stack Integration

**Astro 5 API Routes:**

- Endpoints implemented in `src/pages/api/` directory
- Each endpoint is a separate file/folder with HTTP method handlers
- Example: `src/pages/api/bets/index.ts` exports `GET` and `POST` functions
- Add `export const prerender = false` to all API route files

**Supabase Client Usage:**

- Access via `context.locals.supabase` in API routes
- Uses user's session token automatically
- RLS policies applied transparently
- Type-safe with generated database types

**Zod Validation:**

- Define schemas in shared location (`src/lib/validation.ts`)
- Validate request bodies before passing to Supabase
- Return clear error messages for validation failures

**Error Handling Pattern:**

```typescript
// Early returns for validation errors
if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid request",
      details: validationResult.error.issues,
    }),
    { status: 400 }
  );
}

// Business logic in services (src/lib/services/)
const result = await createBet(supabase, data);

// Handle service errors
if (result.error) {
  return new Response(JSON.stringify({ error: result.error }), {
    status: result.status,
  });
}

// Success response
return new Response(JSON.stringify({ data: result.data }), {
  status: 201,
});
```

### 6.2 Testing Considerations

**Unit Tests:**

- Test Zod validation schemas independently
- Test service functions with mocked Supabase client
- Test business logic calculations (ranking, scoring)

**Integration Tests:**

- Test API endpoints with test Supabase project
- Test RLS policies with different user contexts
- Test time-based validations (mock current time)

**End-to-End Tests:**

- Test complete user flows (register → bet → view leaderboard)
- Test Edge Functions in staging environment
- Test external API integration with mock data

### 6.3 Performance Optimization

**Database Indexes:**

- All foreign keys indexed automatically
- Additional indexes on frequently filtered columns (already defined in schema)
- Leaderboard queries optimized with denormalized scores table

**Query Optimization:**

- Use `select` to limit returned columns
- Use Supabase `limit` and `range` for pagination
- Join only necessary tables for each endpoint

**Caching Strategy:**

- Leaderboards can be cached for 5-10 minutes (stale data acceptable)
- Match lists can be cached until next sync (1 hour)
- Bets always fetched fresh (user-specific, frequently updated)

**Rate Limiting:**

- Implement at middleware level (not in MVP scope)
- Suggested limits: 100 requests per minute per user
- Admin endpoints: 1000 requests per minute (for sync scripts)

### 6.4 Monitoring and Logging

**Application Logs:**

- Log all API errors with context (user_id, request_id, timestamp)
- Log slow queries (> 1 second)
- Log external API failures (api-football.com)

**Metrics to Track:**

- API response times per endpoint
- Error rates by endpoint and error type
- User activity (bets placed, leaderboard views)
- Background job success/failure rates

**Alerting:**

- Alert on high error rates (> 5% of requests)
- Alert on scoring function failures
- Alert on external API downtime

---

## 7. Future Enhancements (Out of MVP Scope)

These features are not part of the MVP but are documented for future development:

1. **Real-time Updates:** WebSocket or Server-Sent Events for live leaderboard updates
2. **Private Groups:** Allow users to create closed groups with invite codes
3. **Advanced Betting:** Exact score predictions, goal scorers, etc.
4. **Notifications:** Email/push notifications for match starts, results, rank changes
5. **Social Features:** Friend system, direct messaging, activity feeds
6. **Statistics:** Personal stats (accuracy rate, best tournament, etc.)
7. **Multiple Seasons:** Archive past tournaments and allow historical browsing
8. **API Rate Limiting:** Formal rate limiting with quotas
9. **API Versioning:** Explicit version management for breaking changes
10. **Mobile Apps:** Native iOS/Android apps with same API backend
