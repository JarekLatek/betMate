#!/bin/bash

# Test script for GET /api/tournaments/:tournament_id/leaderboard endpoint
# Based on implementation plan test scenarios

BASE_URL="http://localhost:3000"
ENDPOINT_PATH="/api/tournaments"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Function to print test header
print_test() {
  echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}TEST $1: $2${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check response
check_response() {
  local expected_status=$1
  local actual_status=$2
  local test_name=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$actual_status" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Expected status $expected_status, got $actual_status"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAILED${NC} - Expected status $expected_status, got $actual_status"
  fi
}

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
  echo -e "${RED}ERROR: TOKEN environment variable is not set${NC}"
  echo "Please set your Supabase access token:"
  echo "  export TOKEN='your_supabase_access_token'"
  echo ""
  echo "You can get a token by:"
  echo "  1. Logging in to your app"
  echo "  2. Opening browser DevTools > Application > Local Storage"
  echo "  3. Looking for 'sb-*-auth-token' key"
  exit 1
fi

echo -e "${GREEN}Starting API tests for leaderboard endpoint...${NC}"
echo "Base URL: $BASE_URL"
echo "Token: ${TOKEN:0:20}..."

# ============================================================================
# TEST 1: Successful request (200 OK)
# ============================================================================
print_test "1" "Successful leaderboard request"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 200 "$STATUS" "Basic leaderboard fetch"

# Check response structure
if echo "$BODY" | jq -e '.data' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Response contains 'data' field"
else
  echo -e "${RED}✗${NC} Response missing 'data' field"
fi

if echo "$BODY" | jq -e '.pagination' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Response contains 'pagination' field"
else
  echo -e "${RED}✗${NC} Response missing 'pagination' field"
fi

if echo "$BODY" | jq -e '.tournament' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Response contains 'tournament' field"
else
  echo -e "${RED}✗${NC} Response missing 'tournament' field"
fi

# ============================================================================
# TEST 2: Request with pagination parameters (200 OK)
# ============================================================================
print_test "2" "Leaderboard with pagination (limit=50, offset=0)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard?limit=50&offset=0")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard?limit=50&offset=0"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 200 "$STATUS" "Pagination parameters"

# Check pagination values
LIMIT=$(echo "$BODY" | jq -r '.pagination.limit' 2>/dev/null)
OFFSET=$(echo "$BODY" | jq -r '.pagination.offset' 2>/dev/null)

if [ "$LIMIT" = "50" ]; then
  echo -e "${GREEN}✓${NC} Pagination limit correctly set to 50"
else
  echo -e "${RED}✗${NC} Pagination limit incorrect: $LIMIT"
fi

if [ "$OFFSET" = "0" ]; then
  echo -e "${GREEN}✓${NC} Pagination offset correctly set to 0"
else
  echo -e "${RED}✗${NC} Pagination offset incorrect: $OFFSET"
fi

# ============================================================================
# TEST 3: Request without authentication (401 Unauthorized)
# ============================================================================
print_test "3" "Request without authentication token"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard (no token)"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 401 "$STATUS" "Missing authentication"

# ============================================================================
# TEST 4: Invalid tournament_id (400 Bad Request)
# ============================================================================
print_test "4" "Invalid tournament_id (non-numeric)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/abc/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/abc/leaderboard"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 400 "$STATUS" "Invalid tournament_id"

# ============================================================================
# TEST 5: Negative tournament_id (400 Bad Request)
# ============================================================================
print_test "5" "Negative tournament_id"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/-1/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/-1/leaderboard"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 400 "$STATUS" "Negative tournament_id"

# ============================================================================
# TEST 6: Non-existent tournament (404 Not Found)
# ============================================================================
print_test "6" "Non-existent tournament"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/99999/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/99999/leaderboard"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 404 "$STATUS" "Non-existent tournament"

# ============================================================================
# TEST 7: Invalid limit (exceeds maximum 500)
# ============================================================================
print_test "7" "Invalid limit parameter (exceeds 500)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard?limit=1000")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard?limit=1000"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 400 "$STATUS" "Limit exceeds maximum"

# ============================================================================
# TEST 8: Invalid limit (less than 1)
# ============================================================================
print_test "8" "Invalid limit parameter (less than 1)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard?limit=0")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard?limit=0"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 400 "$STATUS" "Limit less than minimum"

# ============================================================================
# TEST 9: Invalid offset (negative)
# ============================================================================
print_test "9" "Invalid offset parameter (negative)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard?offset=-1")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard?offset=-1"
echo "Response Status: $STATUS"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

check_response 400 "$STATUS" "Negative offset"

# ============================================================================
# TEST 10: Default pagination values
# ============================================================================
print_test "10" "Default pagination values (no params)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL$ENDPOINT_PATH/1/leaderboard")

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Request: GET $ENDPOINT_PATH/1/leaderboard (no params)"
echo "Response Status: $STATUS"

check_response 200 "$STATUS" "Default pagination"

# Check default values
LIMIT=$(echo "$BODY" | jq -r '.pagination.limit' 2>/dev/null)
OFFSET=$(echo "$BODY" | jq -r '.pagination.offset' 2>/dev/null)

if [ "$LIMIT" = "100" ]; then
  echo -e "${GREEN}✓${NC} Default limit is 100"
else
  echo -e "${RED}✗${NC} Default limit incorrect: $LIMIT (expected 100)"
fi

if [ "$OFFSET" = "0" ]; then
  echo -e "${GREEN}✓${NC} Default offset is 0"
else
  echo -e "${RED}✗${NC} Default offset incorrect: $OFFSET (expected 0)"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi
