# POST /api/bets - Test Scenarios & Results

## Test Environment

- Server: http://localhost:3000
- Endpoint: POST /api/bets
- Date: 2025-11-10

## Test Results

### ✅ Test 1: Unauthorized Access (401)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "error": "Authentication required"
}
```

**HTTP Status:** 401 Unauthorized

**Result:** ✅ PASSED

---

### 📝 Test 2: Invalid Input - Bad match_id (400)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": -1, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["match_id"],
      "message": "match_id must be a positive integer"
    }
  ]
}
```

**HTTP Status:** 400 Bad Request

**Result:** 🔐 Requires valid Supabase auth token

---

### 📝 Test 3: Invalid Input - Bad picked_result (400)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": 101, "picked_result": "INVALID"}'
```

**Expected Response:**

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["picked_result"],
      "message": "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN"
    }
  ]
}
```

**HTTP Status:** 400 Bad Request

**Result:** 🔐 Requires valid Supabase auth token

---

### 📝 Test 4: Invalid JSON (400)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d 'invalid json'
```

**Expected Response:**

```json
{
  "error": "Invalid JSON in request body"
}
```

**HTTP Status:** 400 Bad Request

**Result:** 🔐 Requires valid Supabase auth token

---

### 📝 Test 5: Match Not Found (404)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": 999999, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "error": "Match not found"
}
```

**HTTP Status:** 404 Not Found

**Result:** 🔐 Requires valid Supabase auth token + non-existent match_id

---

### 📝 Test 6: Forbidden - Match Not SCHEDULED or <5 min (403)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "error": "Cannot bet on this match",
  "reason": "Match does not meet betting requirements (must be SCHEDULED and start in more than 5 minutes)"
}
```

**HTTP Status:** 403 Forbidden

**Result:** 🔐 Requires valid Supabase auth token + match with wrong status/time

---

### 📝 Test 7: Duplicate Bet (409)

**Request:** (Call twice with same match_id)

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "error": "Bet already exists for this match"
}
```

**HTTP Status:** 409 Conflict

**Result:** 🔐 Requires valid Supabase auth token + existing bet on same match

---

### 📝 Test 8: Success (201)

**Request:**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid_token>" \
  -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
```

**Expected Response:**

```json
{
  "data": {
    "id": 1,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "HOME_WIN",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": null
  }
}
```

**HTTP Status:** 201 Created  
**Headers:** `Location: /api/bets/1`

**Result:** 🔐 Requires valid Supabase auth token + valid SCHEDULED match

---

## Summary

### Implemented Features ✅

- ✅ Authentication check (401)
- ✅ Request body JSON parsing with error handling
- ✅ Zod validation schema for input data
- ✅ Error mapping utility for database errors
- ✅ BetService for database operations
- ✅ Proper HTTP status codes
- ✅ Location header on successful creation
- ✅ TypeScript strict mode compliance
- ✅ Early return pattern (no else statements)

### Testing Status

- ✅ **Test 1 (401):** VERIFIED - Works correctly
- 🔐 **Tests 2-8:** Require Supabase authentication setup
  - Need valid JWT token from Supabase Auth
  - Need test data in database (matches, users)
  - Need RLS policies enabled

### Next Steps for Full Testing

1. Set up Supabase local development environment
2. Create test user and obtain JWT token
3. Seed database with test matches
4. Run integration tests with valid authentication
5. Test all error scenarios (404, 403, 409)
6. Test success scenario (201)

### Code Quality ✅

- No TypeScript errors
- No ESLint errors
- Follows Astro patterns from CLAUDE.md
- Proper error handling hierarchy
- Clean separation of concerns (validation, service, error mapping)
