#!/bin/bash

# Test script for GET /api/matches endpoint
# This script demonstrates all test cases from the implementation plan

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/matches"

echo "========================================="
echo "Testing GET /api/matches endpoint"
echo "========================================="
echo ""

# Note: For these tests to work, you need:
# 1. A running Supabase instance with matches data
# 2. A valid authentication token
# 3. Set the ACCESS_TOKEN variable below

echo "📋 Test Prerequisites:"
echo "   - Server running at: ${BASE_URL}"
echo "   - Valid authentication token (set ACCESS_TOKEN variable)"
echo "   - Matches data in database"
echo ""

# TODO: Replace with your actual access token
# You can get this from Supabase Auth or browser DevTools after logging in
ACCESS_TOKEN="YOUR_ACCESS_TOKEN_HERE"

# Test 1: Unauthorized (401)
echo "Test 1: Unauthorized request (401)"
echo "-----------------------------------"
curl -X GET "${API_ENDPOINT}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 2: Basic request - all matches with defaults (200)
echo "Test 2: All matches with default pagination (200)"
echo "--------------------------------------------------"
curl -X GET "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 3: Filter by tournament_id (200)
echo "Test 3: Filter by tournament_id=1 (200)"
echo "----------------------------------------"
curl -X GET "${API_ENDPOINT}?tournament_id=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 4: Filter by status (200)
echo "Test 4: Filter by status=SCHEDULED (200)"
echo "-----------------------------------------"
curl -X GET "${API_ENDPOINT}?status=SCHEDULED" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 5: Filter by date range (200)
echo "Test 5: Filter by date range (200)"
echo "-----------------------------------"
curl -X GET "${API_ENDPOINT}?from_date=2025-11-01T00:00:00Z&to_date=2025-11-30T23:59:59Z" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 6: Custom pagination (200)
echo "Test 6: Custom pagination - limit=10, offset=0 (200)"
echo "-----------------------------------------------------"
curl -X GET "${API_ENDPOINT}?limit=10&offset=0" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 7: Combined filters (200)
echo "Test 7: Combined filters - tournament + status + limit (200)"
echo "-------------------------------------------------------------"
curl -X GET "${API_ENDPOINT}?tournament_id=1&status=SCHEDULED&limit=25" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 8: Invalid limit - too high (400)
echo "Test 8: Invalid limit - exceeds maximum (400)"
echo "----------------------------------------------"
curl -X GET "${API_ENDPOINT}?limit=150" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 9: Invalid limit - negative (400)
echo "Test 9: Invalid limit - negative number (400)"
echo "----------------------------------------------"
curl -X GET "${API_ENDPOINT}?limit=-10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 10: Invalid status enum (400)
echo "Test 10: Invalid status - not in enum (400)"
echo "--------------------------------------------"
curl -X GET "${API_ENDPOINT}?status=INVALID_STATUS" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 11: Invalid date format (400)
echo "Test 11: Invalid date format (400)"
echo "-----------------------------------"
curl -X GET "${API_ENDPOINT}?from_date=2025-11-01" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 12: Invalid date range - to_date before from_date (400)
echo "Test 12: Invalid date range - to_date before from_date (400)"
echo "-------------------------------------------------------------"
curl -X GET "${API_ENDPOINT}?from_date=2025-11-30T00:00:00Z&to_date=2025-11-01T00:00:00Z" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 13: Pagination - second page (200)
echo "Test 13: Pagination - second page with offset (200)"
echo "----------------------------------------------------"
curl -X GET "${API_ENDPOINT}?limit=10&offset=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 14: Filter by multiple statuses using IN_PLAY (200)
echo "Test 14: Filter by status=IN_PLAY (200)"
echo "----------------------------------------"
curl -X GET "${API_ENDPOINT}?status=IN_PLAY" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 15: Complex query - all filters combined (200)
echo "Test 15: Complex query - all filters (200)"
echo "-------------------------------------------"
curl -X GET "${API_ENDPOINT}?tournament_id=1&status=SCHEDULED&from_date=2025-11-01T00:00:00Z&to_date=2025-12-31T23:59:59Z&limit=20&offset=0" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

echo "========================================="
echo "All tests completed!"
echo "========================================="
