#!/bin/bash

# Setup Auto-Update System for Resonance
# This script helps configure the GitHub repository for auto-updates

echo "🚀 Resonance Auto-Update Setup"
echo "================================"
echo ""

# Get GitHub repository info
echo "Enter your GitHub username:"
read GITHUB_USER

echo "Enter your repository name (e.g., resonance):"
read GITHUB_REPO

echo ""
echo "📝 Configuration:"
echo "   Repository: https://github.com/$GITHUB_USER/$GITHUB_REPO"
echo ""

# Confirm
echo "Is this correct? (y/n)"
read CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Setup cancelled"
    exit 1
fi

# Update the voidUpdateMainService.ts file
UPDATE_FILE="void-editor/src/vs/workbench/contrib/void/electron-main/voidUpdateMainService.ts"

if [ ! -f "$UPDATE_FILE" ]; then
    echo "❌ Error: Could not find $UPDATE_FILE"
    exit 1
fi

# Backup original file
cp "$UPDATE_FILE" "${UPDATE_FILE}.backup"
echo "✅ Created backup: ${UPDATE_FILE}.backup"

# Replace the GitHub URL
sed -i.tmp "s|YOUR_USERNAME/YOUR_REPO|$GITHUB_USER/$GITHUB_REPO|g" "$UPDATE_FILE"
rm "${UPDATE_FILE}.tmp" 2>/dev/null

echo "✅ Updated GitHub repository URL"

# Update voidUpdateActions.ts for download page
ACTIONS_FILE="void-editor/src/vs/workbench/contrib/void/browser/voidUpdateActions.ts"

if [ -f "$ACTIONS_FILE" ]; then
    echo ""
    echo "Enter your download page URL (or press Enter to skip):"
    echo "Example: https://yourwebsite.com/download"
    read DOWNLOAD_URL
    
    if [ ! -z "$DOWNLOAD_URL" ]; then
        cp "$ACTIONS_FILE" "${ACTIONS_FILE}.backup"
        sed -i.tmp "s|https://voideditor.com/download-beta|$DOWNLOAD_URL|g" "$ACTIONS_FILE"
        rm "${ACTIONS_FILE}.tmp" 2>/dev/null
        echo "✅ Updated download page URL"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a GitHub release with tag matching your version"
echo "2. Upload your built binaries to the release"
echo "3. Test the update system with: 'Void: Check for Updates'"
echo ""
echo "📖 See AUTO_UPDATE_SYSTEM.md for detailed instructions"
