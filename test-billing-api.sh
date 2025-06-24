#!/bin/bash

echo "🧪 TESTING BILLING API ENDPOINT"
echo "==============================="

echo "📡 Testing API endpoint directly..."

# Test the billing API endpoint
curl -s "http://localhost:3000/api/facility/trips-billing?year=2025&month=6" \
  -H "Content-Type: application/json" | head -c 1000

echo ""
echo ""
echo "🔍 If you see JSON data above, the API is working"
echo "💡 Look for client_name fields in the response"
echo "🎯 Expected format: 'David Patel (Managed) - (416) 555-2233'"
