#!/bin/bash
# Simple billing fix script for macOS/zsh

echo "🔧 Quick Billing Fix Script"
echo "=========================="

# Start development server if not running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "Starting development server..."
    npm run dev &
    sleep 5
fi

# Run the ultimate billing fix
echo "Running billing data fix..."
node ultimate-billing-fix.js

echo "✅ Billing fix complete!"
echo "Open: http://localhost:3000/dashboard/billing"
