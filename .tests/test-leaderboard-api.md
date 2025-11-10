# Testing the Leaderboard API Endpoint

## Endpoint Details

**URL:** `GET /api/tournaments/:tournament_id/leaderboard`

**Authentication:** Required (Bearer token)

**Query Parameters:**

- `limit` (optional): Number of results per page (default: 100, max: 500)
- `offset` (optional): Pagination offset (default: 0)

## Running Tests

### 1. Quick Test Without Authentication (Should return 401)

```bash
curl http://localhost:3000/api/tournaments/1/leaderboard
```

Expected response:

```json
{ "error": "Authentication required" }
```

### 2. Get Authentication Token

You need a valid Supabase access token. Options:

**Option A: If you have a user account in the app:**

1. Login to http://localhost:3000
2. Open DevTools (F12) > Application > Local Storage
3. Find `sb-*-auth-token` key
4. Copy the `access_token` value
5. Export it: `export TOKEN='your_access_token_here'`

**Option B: Using Supabase Auth API (if you have test credentials):**

```bash
# Replace with your actual Supabase URL and anon key from .env
SUPABASE_URL="your_supabase_url"
ANON_KEY="your_anon_key"

# Login and get token
TOKEN=$(curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "your_password"}' \
  | jq -r .access_token)

export TOKEN
```

### 3. Run Complete Test Suite

```bash
./test-leaderboard-api.sh
```

The script will test:

- ✅ Successful requests with valid token
- ✅ Authentication errors (401)
- ✅ Validation errors for invalid parameters (400)
- ✅ Tournament not found (404)
- ✅ Pagination behavior

## Manual Test Examples

### Basic Request

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard"
```

### With Pagination

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard?limit=50&offset=0"
```

### Invalid Tournament ID (should return 400)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/abc/leaderboard"
```

### Non-existent Tournament (should return 404)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/99999/leaderboard"
```

### Invalid Limit (should return 400)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard?limit=1000"
```

## Expected Response Structure

### Success (200 OK)

```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "uuid-here",
      "username": "john_doe",
      "points": 45
    },
    {
      "rank": 2,
      "user_id": "uuid-here",
      "username": "jane_smith",
      "points": 42
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
    "name": "Tournament Name"
  }
}
```

### Error Responses

**401 Unauthorized:**

```json
{ "error": "Authentication required" }
```

**400 Bad Request:**

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "limit must not exceed 500"
    }
  ]
}
```

**404 Not Found:**

```json
{ "error": "Tournament not found" }
```

## Verifying Business Logic

### Ex Aequo Ranking

Users with the same points should have the same rank:

```json
{
  "data": [
    { "rank": 1, "user_id": "...", "username": "user1", "points": 50 },
    { "rank": 2, "user_id": "...", "username": "user2", "points": 45 },
    { "rank": 2, "user_id": "...", "username": "user3", "points": 45 },
    { "rank": 4, "user_id": "...", "username": "user4", "points": 40 }
  ]
}
```

Note: Rank jumps from 2 to 4 (not 3) when there are tied positions.

### Pagination

- `has_more: true` when there are more results beyond current page
- `has_more: false` when displaying the last page
- `total` reflects the total number of participants in the tournament
