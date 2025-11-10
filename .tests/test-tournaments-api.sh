#!/bin/bash

# Test script for GET /api/tournaments endpoint
# This script demonstrates all test cases from the implementation plan

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/api/tournaments"

echo "========================================="
echo "Testing GET /api/tournaments endpoint"
echo "========================================="
echo ""

# Note: For these tests to work, you need:
# 1. A running Supabase instance
# 2. At least one tournament in the database (optional - can test with empty array)
# 3. A valid authentication token (for authenticated tests)

echo "📋 Test Prerequisites:"
echo "   - Server running at: ${BASE_URL}"
echo "   - Supabase configured and running"
echo "   - Valid authentication token (for Test 2)"
echo ""

# Test 1: Unauthorized (401)
echo "Test 1: Unauthorized request (401)"
echo "-----------------------------------"
echo "Request: GET ${API_ENDPOINT} (no Authorization header)"
curl -X GET "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 2: Successful request with authentication (200)
echo "Test 2: Authenticated request (200)"
echo "------------------------------------"
echo "❗ REQUIRED: Set SUPABASE_ACCESS_TOKEN environment variable"
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "⚠️  SKIPPED: SUPABASE_ACCESS_TOKEN not set"
  echo ""
  echo "To run this test:"
  echo "1. Login to your app or use Supabase dashboard to get a token"
  echo "2. Export the token:"
  echo "   export SUPABASE_ACCESS_TOKEN='your-token-here'"
  echo "3. Run this script again"
else
  echo "Request: GET ${API_ENDPOINT} (with Authorization header)"
  RESPONSE=$(curl -X GET "${API_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -w "\nHTTP_STATUS:%{http_code}" \
    -s)
  
  # Extract body and status
  BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
  STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')
  
  echo "Response Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "HTTP Status: ${STATUS}"
  echo ""
  
  # Verify response structure
  if [ "$STATUS" = "200" ]; then
    echo "✅ Status code correct (200)"
    
    # Check if 'data' key exists
    if echo "$BODY" | jq -e '.data' >/dev/null 2>&1; then
      echo "✅ Response has 'data' key"
      
      # Check if data is an array
      if echo "$BODY" | jq -e '.data | type == "array"' >/dev/null 2>&1; then
        echo "✅ 'data' is an array"
        
        # Count tournaments
        COUNT=$(echo "$BODY" | jq '.data | length')
        echo "📊 Found ${COUNT} tournament(s)"
        
        # If there are tournaments, check first one's structure
        if [ "$COUNT" -gt 0 ]; then
          echo ""
          echo "Sample tournament:"
          echo "$BODY" | jq '.data[0]'
          
          # Verify required fields
          if echo "$BODY" | jq -e '.data[0] | has("id")' >/dev/null 2>&1 && \
             echo "$BODY" | jq -e '.data[0] | has("name")' >/dev/null 2>&1 && \
             echo "$BODY" | jq -e '.data[0] | has("api_tournament_id")' >/dev/null 2>&1; then
            echo "✅ Tournament has all required fields (id, name, api_tournament_id)"
          else
            echo "❌ Tournament missing required fields"
          fi
          
          # Check if tournaments are sorted by name (if more than 1)
          if [ "$COUNT" -gt 1 ]; then
            SORTED=$(echo "$BODY" | jq '[.data | sort_by(.name)] == .data')
            if [ "$SORTED" = "true" ]; then
              echo "✅ Tournaments are sorted alphabetically by name"
            else
              echo "⚠️  Tournaments may not be sorted by name"
            fi
          fi
        else
          echo "ℹ️  No tournaments in database (empty array is valid)"
        fi
      else
        echo "❌ 'data' is not an array"
      fi
    else
      echo "❌ Response missing 'data' key"
    fi
  else
    echo "❌ Unexpected status code: ${STATUS}"
  fi
fi

echo ""
echo ""

# Test 3: Check caching headers
echo "Test 3: Verify caching headers"
echo "-------------------------------"
echo "Checking for Cache-Control header..."
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "⚠️  SKIPPED: SUPABASE_ACCESS_TOKEN not set"
else
  HEADERS=$(curl -X GET "${API_ENDPOINT}" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -s -D - -o /dev/null)
  
  echo "Response Headers:"
  echo "$HEADERS" | grep -i "cache-control\|content-type"
  echo ""
  
  if echo "$HEADERS" | grep -qi "cache-control.*max-age"; then
    echo "✅ Cache-Control header present"
  else
    echo "⚠️  Cache-Control header not found"
  fi
fi

echo ""
echo "========================================="
echo "Tests completed!"
echo "========================================="
echo ""
echo "Summary of expected results:"
echo "  Test 1: 401 Unauthorized (no token)"
echo "  Test 2: 200 OK with data array (with valid token)"
echo "  Test 3: Cache-Control header present"
