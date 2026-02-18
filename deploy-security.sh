#!/bin/bash

# Firebase Security Deployment Script
# This script helps you deploy security rules to Firebase

echo "🔒 Firebase Security Deployment"
echo "================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    echo ""
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
    echo ""
fi

# Login to Firebase
echo "📝 Step 1: Login to Firebase"
echo "----------------------------"
firebase login
echo ""

# Show current project
echo "🎯 Step 2: Verify Project"
echo "-------------------------"
echo "Current project: bundling-63c10"
firebase use bundling-63c10
echo ""

# Show what will be deployed
echo "📋 Step 3: Review Security Rules"
echo "--------------------------------"
echo "The following rules will be deployed:"
echo ""
cat firestore.rules
echo ""
read -p "Do these rules look correct? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Deploy rules
echo ""
echo "🚀 Step 4: Deploying Security Rules"
echo "------------------------------------"
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Security rules deployed"
    echo ""
    echo "Next steps:"
    echo "1. Test your app to make sure it still works"
    echo "2. Regenerate your Firebase API key"
    echo "3. Update .env and Vercel environment variables"
    echo "4. Review SECURITY_SETUP.md for full checklist"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo "Please check the error message above"
    echo ""
fi
