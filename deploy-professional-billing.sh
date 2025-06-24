#!/bin/bash

# 🚀 PROFESSIONAL BILLING SYSTEM DEPLOYMENT SCRIPT
# This script deploys the professional billing enhancements to production

echo "🚀 DEPLOYING PROFESSIONAL BILLING SYSTEM"
echo "========================================="
echo ""

# Check current directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Not in the correct directory. Please run from facility_app root."
    exit 1
fi

echo "📂 Current directory: $(pwd)"
echo "✅ package.json found"
echo ""

# Step 1: Build the application
echo "1️⃣ Building Next.js application..."
npm run build

if [[ $? -ne 0 ]]; then
    echo "❌ Build failed! Please check for errors."
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""

# Step 2: Check if this is a local development or production deployment
if [[ -f ".env.local" ]]; then
    echo "2️⃣ Starting local development server..."
    echo "🌐 Server will be available at: http://localhost:3000"
    echo "📊 Billing page: http://localhost:3000/dashboard/billing"
    echo ""
    echo "🔧 To test the fixes:"
    echo "   1. Navigate to the billing page"
    echo "   2. Open browser console (F12)"
    echo "   3. Paste the verification script"
    echo ""
    echo "Starting server..."
    npm run start
else
    echo "2️⃣ Production deployment detected"
    echo "✅ Application built and ready for deployment"
    echo ""
    echo "🌐 If using Vercel:"
    echo "   - Changes will auto-deploy when pushed to git"
    echo "   - Check Vercel dashboard for deployment status"
    echo ""
    echo "🌐 If using other hosting:"
    echo "   - Copy the .next/ folder to your production server"
    echo "   - Run 'npm run start' on the production server"
    echo ""
fi

echo "🎯 DEPLOYMENT COMPLETED!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Visit your billing page"
echo "2. Run the verification script in browser console"
echo "3. Verify professional status and client names are working"
echo ""
echo "✅ Expected results:"
echo "   - Status: UPCOMING/DUE/CANCELLED (not pending/completed)"
echo "   - Client names: 'David Patel (Managed) - (416) 555-2233'"
echo "   - Professional status colors and icons"
