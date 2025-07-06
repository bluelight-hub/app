#!/bin/bash

# IP Whitelist API Test Script
# This script demonstrates how to use the IP Whitelist API

BASE_URL="http://localhost:3000/api/admin/security/whitelist"

echo "=== IP Whitelist API Test Script ==="
echo "Base URL: $BASE_URL"
echo ""

# Function to pretty print JSON responses
pretty_json() {
    if command -v jq >/dev/null 2>&1; then
        echo "$1" | jq .
    else
        echo "$1"
    fi
}

# Test 1: Create a new IP whitelist entry
echo "1. Creating IP whitelist entry..."
response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "ipAddress": "192.168.1.100",
        "description": "Test office IP",
        "createdBy": "admin"
    }')
pretty_json "$response"
echo ""

# Extract the ID from the response (requires jq)
if command -v jq >/dev/null 2>&1; then
    IP_ID=$(echo "$response" | jq -r '.id // empty')
else
    echo "Note: Install 'jq' for automatic ID extraction"
    echo "Please copy the ID from the response above and set IP_ID variable"
    # IP_ID="your-id-here"  # Uncomment and set manually if no jq
fi

# Test 2: Get all IP whitelist entries
echo "2. Getting all IP whitelist entries..."
response=$(curl -s -X GET "$BASE_URL")
pretty_json "$response"
echo ""

# Test 3: Get only active IP whitelist entries
echo "3. Getting active IP whitelist entries..."
response=$(curl -s -X GET "$BASE_URL/active")
pretty_json "$response"
echo ""

# Test 4: Get specific IP whitelist entry (requires ID)
if [ ! -z "$IP_ID" ]; then
    echo "4. Getting IP whitelist entry by ID: $IP_ID"
    response=$(curl -s -X GET "$BASE_URL/$IP_ID")
    pretty_json "$response"
    echo ""
else
    echo "4. Skipping get by ID test (no ID available)"
    echo ""
fi

# Test 5: Update IP whitelist entry (requires ID)
if [ ! -z "$IP_ID" ]; then
    echo "5. Updating IP whitelist entry: $IP_ID"
    response=$(curl -s -X PATCH "$BASE_URL/$IP_ID" \
        -H "Content-Type: application/json" \
        -d '{
            "description": "Updated test office IP",
            "isActive": true
        }')
    pretty_json "$response"
    echo ""
else
    echo "5. Skipping update test (no ID available)"
    echo ""
fi

# Test 6: Deactivate IP whitelist entry (requires ID)
if [ ! -z "$IP_ID" ]; then
    echo "6. Deactivating IP whitelist entry: $IP_ID"
    response=$(curl -s -X PATCH "$BASE_URL/$IP_ID/deactivate")
    pretty_json "$response"
    echo ""
else
    echo "6. Skipping deactivate test (no ID available)"
    echo ""
fi

# Test 7: Activate IP whitelist entry (requires ID)
if [ ! -z "$IP_ID" ]; then
    echo "7. Activating IP whitelist entry: $IP_ID"
    response=$(curl -s -X PATCH "$BASE_URL/$IP_ID/activate")
    pretty_json "$response"
    echo ""
else
    echo "7. Skipping activate test (no ID available)"
    echo ""
fi

# Test 8: Error handling - try to create duplicate IP
echo "8. Testing error handling (duplicate IP)..."
response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "ipAddress": "192.168.1.100",
        "description": "Duplicate IP test",
        "createdBy": "admin"
    }')
pretty_json "$response"
echo ""

# Test 9: Error handling - invalid IP address
echo "9. Testing error handling (invalid IP)..."
response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "ipAddress": "invalid-ip-address",
        "description": "Invalid IP test",
        "createdBy": "admin"
    }')
pretty_json "$response"
echo ""

# Test 10: Rate limiting test (optional - will make many requests)
echo "10. Testing rate limiting (making 12 rapid requests)..."
echo "This should trigger rate limiting after 10 requests..."
for i in {1..12}; do
    response=$(curl -s -w "HTTP %{http_code} " -X GET "$BASE_URL")
    echo "Request $i: $response" | head -c 50
    echo ""
    sleep 0.1  # Small delay between requests
done
echo ""

# Test 11: Delete IP whitelist entry (requires ID) - DESTRUCTIVE
read -p "11. Do you want to delete the test IP entry? (y/N): " confirm
if [[ $confirm == [yY] ]] && [ ! -z "$IP_ID" ]; then
    echo "Deleting IP whitelist entry: $IP_ID"
    response=$(curl -s -X DELETE "$BASE_URL/$IP_ID" -w "HTTP %{http_code}")
    echo "Response: $response"
    echo ""
elif [ -z "$IP_ID" ]; then
    echo "Skipping delete test (no ID available)"
    echo ""
else
    echo "Skipping delete test (user declined)"
    echo ""
fi

echo "=== Test Script Complete ==="
echo "Check the server logs for audit trail entries."
echo ""
echo "To enable IP whitelist enforcement:"
echo "  Set IP_WHITELIST_ENABLED=true in your environment"
echo "  Restart the server"
echo "  Only whitelisted IPs will be able to access the API"