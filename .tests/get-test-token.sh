#!/bin/bash

# Helper script to get an authentication token for testing
# This script helps you obtain a token to use with test scripts

echo "🔑 Token Helper for betMate API Testing"
echo "========================================"
echo ""

echo "Option 1: Using Supabase Local Development"
echo "-------------------------------------------"
echo "If you're running Supabase locally, you can:"
echo "1. Start Supabase: supabase start"
echo "2. Get the anon key from the output or run: supabase status"
echo "3. Use the anon key as TOKEN for public endpoints"
echo "4. For authenticated requests, you need a user JWT token"
echo ""

echo "Option 2: Get User Token via Login API"
echo "---------------------------------------"
echo "Create a test user and get their token:"
echo ""
echo "# First, ensure you have a test user in your database"
echo "# Then run this curl command to login:"
echo ""
echo 'curl -X POST "http://localhost:54321/auth/v1/token?grant_type=password" \'
echo '  -H "apikey: YOUR_ANON_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"email": "test@example.com", "password": "testpassword123"}'"'"' | jq -r .access_token'
echo ""
echo "Then export the token:"
echo 'export TOKEN="paste_token_here"'
echo ""

echo "Option 3: Manual Browser Method"
echo "--------------------------------"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login to the application"
echo "3. Open DevTools (F12) > Application/Storage > Local Storage"
echo "4. Find the key matching 'sb-*-auth-token'"
echo "5. Copy the 'access_token' value from the JSON"
echo "6. Export it: export TOKEN='your_access_token'"
echo ""

echo "Quick Test:"
echo "-----------"
echo "After setting TOKEN, test if it works:"
echo 'curl -H "Authorization: Bearer \$TOKEN" http://localhost:3000/api/tournaments | jq'
echo ""
