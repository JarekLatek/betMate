#!/bin/bash

# Test script for GET /api/me/bets endpoint
# This script demonstrates all test cases from the implementation plan

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/me/bets"

echo "========================================="
echo "Testing GET /api/me/bets endpoint"
echo "========================================="
echo ""

# Note: For these tests to work, you need:
# 1. A running Supabase instance
# 2. Some bets in the database for the authenticated user
# 3. A valid authentication token

echo "📋 Test Prerequisites:"
echo "   - Server running at: ${BASE_URL}"
echo "   - Existing bets for authenticated user"
echo "   - Valid authentication token"
echo ""

# Test 1: Unauthorized (401)
echo "Test 1: Unauthorized request (401)"
echo "-----------------------------------"
curl -X GET "${API_ENDPOINT}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 2: Invalid limit - too high (400)
echo "Test 2: Invalid limit - exceeds maximum (400)"
echo "----------------------------------------------"
curl -X GET "${API_ENDPOINT}?limit=150" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 3: Invalid limit - zero (400)
echo "Test 3: Invalid limit - zero (400)"
echo "-----------------------------------"
curl -X GET "${API_ENDPOINT}?limit=0" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 4: Invalid offset - negative (400)
echo "Test 4: Invalid offset - negative number (400)"
echo "-----------------------------------------------"
curl -X GET "${API_ENDPOINT}?offset=-10" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 5: Invalid tournament_id - not a number (400)
echo "Test 5: Invalid tournament_id - not a number (400)"
echo "---------------------------------------------------"
curl -X GET "${API_ENDPOINT}?tournament_id=abc" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 6: Invalid match_id - negative (400)
echo "Test 6: Invalid match_id - negative number (400)"
echo "-------------------------------------------------"
curl -X GET "${API_ENDPOINT}?match_id=-5" \
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
echo "2. Set it as AUTH_TOKEN environment variable or replace in commands below"
echo ""
echo "Example commands:"
echo ""

echo "# Test 7: Get all user bets (200)"
echo "curl -X GET '${API_ENDPOINT}' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 8: Get bets with default pagination (200)"
echo "curl -X GET '${API_ENDPOINT}?limit=10' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 9: Get bets with offset (pagination, 200)"
echo "curl -X GET '${API_ENDPOINT}?limit=5&offset=5' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 10: Filter by tournament_id (200)"
echo "curl -X GET '${API_ENDPOINT}?tournament_id=1' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 11: Filter by specific match_id (200)"
echo "curl -X GET '${API_ENDPOINT}?match_id=101' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 12: Combined filters - tournament + pagination (200)"
echo "curl -X GET '${API_ENDPOINT}?tournament_id=1&limit=20&offset=0' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 13: Maximum limit (200)"
echo "curl -X GET '${API_ENDPOINT}?limit=100' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo "# Test 14: Empty results - non-existent tournament (200 with empty data)"
echo "curl -X GET '${API_ENDPOINT}?tournament_id=99999' \\"
echo "  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \\"
echo "  -s | jq"
echo ""

echo ""
echo "========================================="
echo "Automated test with AUTH_TOKEN:"
echo "========================================="
echo ""

if [ -z "$AUTH_TOKEN" ]; then
  echo "⚠️  AUTH_TOKEN not set. Skipping authenticated tests."
  echo "   Set it with: export AUTH_TOKEN='your_token_here'"
else
  echo "✓ AUTH_TOKEN is set. Running authenticated tests..."
  echo ""
  
  echo "Test 7: Get all user bets (200)"
  echo "-------------------------------"
  curl -X GET "${API_ENDPOINT}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq
  echo ""
  
  echo "Test 8: Get bets with limit=5 (200)"
  echo "------------------------------------"
  curl -X GET "${API_ENDPOINT}?limit=5" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq
  echo ""
  
  echo "Test 9: Get bets with pagination (200)"
  echo "---------------------------------------"
  curl -X GET "${API_ENDPOINT}?limit=3&offset=2" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq
  echo ""
fi

echo ""
echo "========================================="
echo "Test script completed!"
echo "========================================="
