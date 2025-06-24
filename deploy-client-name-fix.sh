#!/bin/bash

# 🚀 CCT Facility App - Client Name Fix Deployment Script
# ========================================================

echo "🏥 CCT Facility App - Deploying Client Name Fixes"
echo "=================================================="

# Navigate to project directory
cd "/Volumes/C/CCT APPS/facility_app"

echo ""
echo "📁 Current directory: $(pwd)"
echo "📂 Checking files..."

# Check if the key file exists
if [ -f "app/api/facility/trips-billing/route.js" ]; then
    echo "✅ Key file exists: app/api/facility/trips-billing/route.js"
else
    echo "❌ Key file missing: app/api/facility/trips-billing/route.js"
    exit 1
fi

echo ""
echo "🔍 Checking deployment method..."

# Method 1: Check for Vercel CLI
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI found - deploying via Vercel"
    echo ""
    echo "🚀 Deploying to production..."
    vercel --prod
    echo ""
    echo "✅ Deployment complete!"
    echo "🔗 Test at: https://facility.compassionatecaretransportation.com/dashboard/billing"
    
# Method 2: Check for git remote
elif git remote -v | grep -q "origin"; then
    echo "✅ Git remote found - deploying via Git"
    echo ""
    echo "📝 Committing changes..."
    git add app/api/facility/trips-billing/route.js
    git commit -m "Fix client name formatting - show names with phone numbers"
    echo ""
    echo "🚀 Pushing to production..."
    git push origin main
    echo ""
    echo "✅ Git push complete!"
    echo "⏳ Wait for auto-deployment, then test at:"
    echo "🔗 https://facility.compassionatecaretransportation.com/dashboard/billing"
    
else
    echo "⚠️  No deployment method detected"
    echo ""
    echo "📋 Manual deployment options:"
    echo "1. Install Vercel CLI: npm install -g vercel"
    echo "2. Run: vercel --prod"
    echo "3. Or upload app/api/facility/trips-billing/route.js to your hosting provider"
    echo ""
    echo "🎯 The key file to deploy is:"
    echo "   app/api/facility/trips-billing/route.js"
fi

echo ""
echo "🔍 Post-deployment verification:"
echo "1. Visit: https://facility.compassionatecaretransportation.com/dashboard/billing"
echo "2. Check client names show as: 'David Patel (Managed) - (416) 555-2233'"
echo "3. Verify no 'Unknown Client' or 'Managed Client (abc123)' names"

echo ""
echo "✨ All client name fixes are ready for production!"
