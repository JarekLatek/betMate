#!/bin/bash

# Test script for PUT /api/bets/:id endpoint
# Tests all scenarios: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

BASE_URL="http://localhost:3000"
ENDPOINT="/api/bets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print section header
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test result
print_result() {
  local test_name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local response="$4"
  
  if [ "$expected_status" = "$actual_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} - $test_name"
    echo -e "  Expected: $expected_status, Got: $actual_status"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - $test_name"
    echo -e "  Expected: $expected_status, Got: $actual_status"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  
  echo -e "  Response: $response\n"
}

# Function to run a test
run_test() {
  local test_name="$1"
  local expected_status="$2"
  local bet_id="$3"
  local token="$4"
  local body="$5"
  
  local curl_cmd="curl -s -w '\n%{http_code}' -X PUT"
  curl_cmd="$curl_cmd '$BASE_URL$ENDPOINT/$bet_id'"
  curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
  
  if [ -n "$token" ]; then
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
  fi
  
  if [ -n "$body" ]; then
    curl_cmd="$curl_cmd -d '$body'"
  fi
  
  local result=$(eval "$curl_cmd")
  local response=$(echo "$result" | head -n -1)
  local status=$(echo "$result" | tail -n 1)
  
  print_result "$test_name" "$expected_status" "$status" "$response"
}

# ============================================================================
# SETUP
# ============================================================================

print_header "SETUP - Configure test variables"

echo -e "${YELLOW}Please provide the following information:${NC}\n"

# Get authentication token
read -p "Enter valid authentication token (from Supabase): " AUTH_TOKEN
echo ""

# Get test bet ID
read -p "Enter a valid bet ID (that you own): " VALID_BET_ID
echo ""

# Get invalid bet ID
read -p "Enter an invalid/non-existent bet ID: " INVALID_BET_ID
echo ""

# Optional: bet ID for forbidden tests (match starting soon)
read -p "Enter bet ID for match starting soon (or press Enter to skip): " FORBIDDEN_BET_ID
echo ""

echo -e "${GREEN}Setup complete!${NC}\n"

# ============================================================================
# TEST 1: SUCCESS (200 OK)
# ============================================================================

print_header "TEST 1: Success - Update bet (200 OK)"

run_test \
  "Update bet with valid data" \
  "200" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

run_test \
  "Update bet to HOME_WIN" \
  "200" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{"picked_result":"HOME_WIN"}'

run_test \
  "Update bet to AWAY_WIN" \
  "200" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{"picked_result":"AWAY_WIN"}'

# ============================================================================
# TEST 2: VALIDATION ERRORS (400 Bad Request)
# ============================================================================

print_header "TEST 2: Validation Errors (400 Bad Request)"

run_test \
  "Invalid picked_result value" \
  "400" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{"picked_result":"INVALID"}'

run_test \
  "Missing picked_result field" \
  "400" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{}'

run_test \
  "Invalid JSON in body" \
  "400" \
  "$VALID_BET_ID" \
  "$AUTH_TOKEN" \
  'invalid json'

run_test \
  "Invalid bet ID (not a number)" \
  "400" \
  "abc" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

run_test \
  "Invalid bet ID (negative number)" \
  "400" \
  "-1" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

run_test \
  "Invalid bet ID (zero)" \
  "400" \
  "0" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

# ============================================================================
# TEST 3: AUTHENTICATION ERRORS (401 Unauthorized)
# ============================================================================

print_header "TEST 3: Authentication Errors (401 Unauthorized)"

run_test \
  "No authentication token" \
  "401" \
  "$VALID_BET_ID" \
  "" \
  '{"picked_result":"DRAW"}'

run_test \
  "Invalid authentication token" \
  "401" \
  "$VALID_BET_ID" \
  "invalid_token_12345" \
  '{"picked_result":"DRAW"}'

# ============================================================================
# TEST 4: AUTHORIZATION ERRORS (403 Forbidden)
# ============================================================================

print_header "TEST 4: Authorization Errors (403 Forbidden)"

if [ -n "$FORBIDDEN_BET_ID" ]; then
  run_test \
    "Match starts in less than 5 minutes" \
    "403" \
    "$FORBIDDEN_BET_ID" \
    "$AUTH_TOKEN" \
    '{"picked_result":"DRAW"}'
else
  echo -e "${YELLOW}⊘ SKIP${NC} - No bet ID provided for forbidden test (match starting soon)\n"
fi

echo -e "${YELLOW}Note: Test for 'Match is not scheduled' requires a bet on a finished/in-play match${NC}\n"

# ============================================================================
# TEST 5: NOT FOUND ERRORS (404 Not Found)
# ============================================================================

print_header "TEST 5: Not Found Errors (404 Not Found)"

run_test \
  "Bet does not exist" \
  "404" \
  "$INVALID_BET_ID" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

run_test \
  "Bet belongs to another user" \
  "404" \
  "99999" \
  "$AUTH_TOKEN" \
  '{"picked_result":"DRAW"}'

# ============================================================================
# SUMMARY
# ============================================================================

print_header "TEST SUMMARY"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}\n"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}\n"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}\n"
  exit 1
fi
