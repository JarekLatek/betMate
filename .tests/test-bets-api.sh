#!/bin/bash

# Test script for POST /api/bets endpoint
# This script demonstrates all test cases from the implementation plan

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/bets"

echo "========================================="
echo "Testing POST /api/bets endpoint"
echo "========================================="
echo ""

# Note: For these tests to work, you need:
# 1. A running Supabase instance
# 2. At least one match in the database with status SCHEDULED
# 3. A valid authentication token

echo "📋 Test Prerequisites:"
echo "   - Server running at: ${BASE_URL}"
echo "   - Valid match_id in database"
echo "   - Valid authentication token"
echo ""

# Test 1: Unauthorized (401)
echo "Test 1: Unauthorized request (401)"
echo "-----------------------------------"
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"match_id": 1, "picked_result": "HOME_WIN"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 2: Invalid JSON (400)
echo "Test 2: Invalid JSON in request body (400)"
echo "-------------------------------------------"
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d 'invalid json' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 3: Invalid match_id (400)
echo "Test 3: Invalid match_id - negative number (400)"
echo "-------------------------------------------------"
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"match_id": -1, "picked_result": "HOME_WIN"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 4: Invalid picked_result (400)
echo "Test 4: Invalid picked_result - wrong enum value (400)"
echo "-------------------------------------------------------"
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"match_id": 1, "picked_result": "INVALID_RESULT"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 5: Missing required field (400)
echo "Test 5: Missing required field - no picked_result (400)"
echo "--------------------------------------------------------"
curl -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"match_id": 1}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

echo "========================================="
echo "Tests requiring authentication:"
echo "========================================="
echo ""
echo "To test authenticated scenarios, you need to:"
echo "1. Get a valid JWT token from Supabase Auth"
echo "2. Replace YOUR_AUTH_TOKEN in the commands below"
echo ""
echo "Example commands:"
echo ""
echo "# Test 6: Success case (201)"
echo "curl -X POST '${API_ENDPOINT}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -d '{\"match_id\": 1, \"picked_result\": \"HOME_WIN\"}'"
echo ""
echo "# Test 7: Duplicate bet (409) - run same command twice"
echo "curl -X POST '${API_ENDPOINT}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -d '{\"match_id\": 1, \"picked_result\": \"DRAW\"}'"
echo ""
echo "# Test 8: Match not found (404)"
echo "curl -X POST '${API_ENDPOINT}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -d '{\"match_id\": 999999, \"picked_result\": \"HOME_WIN\"}'"
echo ""
echo "========================================="
echo "Tests completed!"
echo "========================================="
