# Testing GET /api/matches Endpoint

This document provides instructions for testing the `GET /api/matches` endpoint.

## Quick Start

1. **Start the development server** (if not already running):

   ```bash
   npm run dev
   ```

2. **Run the test script**:
   ```bash
   ./test-matches-api.sh
   ```

## Test Script Overview

The `test-matches-api.sh` script includes 15 comprehensive test cases:

### Unauthorized Tests (No Auth Token Required)

1. **Unauthorized request (401)** - Verifies authentication is required

### Query Parameter Validation Tests (Require Auth Token)

2. **Default pagination** - All matches with limit=50, offset=0
3. **Filter by tournament_id** - Only matches from specific tournament
4. **Filter by status** - Only matches with specific status (SCHEDULED, IN_PLAY, etc.)
5. **Filter by date range** - Matches between from_date and to_date
6. **Custom pagination** - Different limit and offset values
7. **Combined filters** - Multiple filters together
8. **Invalid limit (too high)** - Expects 400 error
9. **Invalid limit (negative)** - Expects 400 error
10. **Invalid status enum** - Expects 400 error
11. **Invalid date format** - Expects 400 error
12. **Invalid date range** - to_date before from_date, expects 400 error
13. **Pagination offset** - Second page of results
14. **Different status filter** - Filter by IN_PLAY status
15. **Complex query** - All filters combined

## Getting an Access Token

To run authenticated tests, you need a valid Supabase access token. You can obtain one by:

### Option 1: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase auth login
```

### Option 2: From Browser DevTools

1. Open the application in your browser
2. Log in with your test account
3. Open Browser DevTools (F12)
4. Go to Application/Storage → Cookies or Local Storage
5. Find the Supabase auth token (usually in a key like `sb-<project-id>-auth-token`)

### Option 3: Programmatically

Create a simple script to get a token:

```javascript
// get-token.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: "your-test-email@example.com",
  password: "your-test-password",
});

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Access Token:", data.session.access_token);
}
```

## Using the Test Script with Authentication

1. **Edit the test script**:

   ```bash
   nano test-matches-api.sh
   ```

2. **Replace the placeholder token**:
   Find this line:

   ```bash
   ACCESS_TOKEN="YOUR_ACCESS_TOKEN_HERE"
   ```

   Replace with your actual token:

   ```bash
   ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

3. **Save and run**:
   ```bash
   ./test-matches-api.sh
   ```

## Manual Testing Examples

### Test 1: Get all matches (default pagination)

```bash
curl -X GET "http://localhost:3000/api/matches" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

### Test 2: Filter by tournament

```bash
curl -X GET "http://localhost:3000/api/matches?tournament_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

### Test 3: Filter by status

```bash
curl -X GET "http://localhost:3000/api/matches?status=SCHEDULED" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

### Test 4: Filter by date range

```bash
curl -X GET "http://localhost:3000/api/matches?from_date=2025-11-01T00:00:00Z&to_date=2025-11-30T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

### Test 5: Custom pagination

```bash
curl -X GET "http://localhost:3000/api/matches?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

### Test 6: All filters combined

```bash
curl -X GET "http://localhost:3000/api/matches?tournament_id=1&status=SCHEDULED&from_date=2025-11-01T00:00:00Z&to_date=2025-12-31T23:59:59Z&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s | jq '.'
```

## Expected Response Format

### Success Response (200)

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
      "is_scored": false,
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
      "is_scored": false,
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

### Error Response (400 - Bad Request)

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "Must be between 1 and 100"
    }
  ]
}
```

### Error Response (401 - Unauthorized)

```json
{
  "error": "Authentication required"
}
```

## Query Parameters Reference

| Parameter       | Type   | Required | Default | Constraints                                       | Description                     |
| --------------- | ------ | -------- | ------- | ------------------------------------------------- | ------------------------------- |
| `tournament_id` | number | No       | -       | Positive integer                                  | Filter matches by tournament ID |
| `status`        | string | No       | -       | SCHEDULED, IN_PLAY, FINISHED, POSTPONED, CANCELED | Filter matches by status        |
| `from_date`     | string | No       | -       | ISO 8601 datetime                                 | Filter matches after this date  |
| `to_date`       | string | No       | -       | ISO 8601 datetime                                 | Filter matches before this date |
| `limit`         | number | No       | 50      | 1-100                                             | Number of results per page      |
| `offset`        | number | No       | 0       | ≥ 0                                               | Number of results to skip       |

## Validation Rules

1. **tournament_id**: Must be a positive integer
2. **status**: Must be one of the valid enum values
3. **from_date**: Must be valid ISO 8601 datetime format
4. **to_date**: Must be valid ISO 8601 datetime format and after from_date
5. **limit**: Must be between 1 and 100 (inclusive)
6. **offset**: Must be 0 or greater

## Common Issues

### Issue: "Authentication required"

- **Cause**: Missing or invalid access token
- **Solution**: Ensure you're passing a valid Bearer token in the Authorization header

### Issue: "Invalid query parameters"

- **Cause**: One or more query parameters don't meet validation requirements
- **Solution**: Check the error details for specific validation failures

### Issue: Empty data array

- **Cause**: No matches match the filter criteria
- **Solution**: Try broader filters or check if matches exist in the database

## Notes

- All dates are in UTC
- The `user_bet` field will only show bets made by the authenticated user
- Pagination uses offset-based pagination (consider cursor-based for production)
- Results are ordered by `match_datetime` in ascending order
