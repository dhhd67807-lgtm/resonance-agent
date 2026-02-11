#!/bin/bash

# Script to rename Void to Resonance in user-facing text
# This preserves technical identifiers like variable names, file paths, etc.

set -e

echo "🔄 Renaming Void to Resonance in user-facing text..."

# Function to replace text in files
replace_in_files() {
    local pattern=$1
    local replacement=$2
    local file_pattern=$3
    
    echo "  Replacing '$pattern' with '$replacement' in $file_pattern files..."
    
    # Use find and sed to replace text
    find src/vs/workbench/contrib/void -type f \( -name "$file_pattern" \) -exec sed -i '' "s/$pattern/$replacement/g" {} +
}

# Replace user-facing strings (in quotes or UI text)
echo "📝 Updating user-facing text..."

# Replace "Void Agent" with "Resonance" (already done but ensuring consistency)
replace_in_files "Void Agent" "Resonance" "*.ts"
replace_in_files "Void Agent" "Resonance" "*.tsx"
replace_in_files "Void Agent" "Resonance" "*.js"

# Replace "Void" in display names and labels (careful to preserve technical names)
# Only replace when it's clearly a display string

# Update package.json display names
if [ -f "package.json" ]; then
    echo "  Updating package.json display names..."
    sed -i '' 's/"displayName": "Void"/"displayName": "Resonance"/g' package.json
    sed -i '' 's/"Void - /"Resonance - /g' package.json
fi

# Update README files
echo "  Updating README files..."
find . -name "README.md" -type f -exec sed -i '' 's/# Void/# Resonance/g' {} +
find . -name "README.md" -type f -exec sed -i '' 's/## Void/## Resonance/g' {} +

# Update window titles and UI labels in TypeScript/JavaScript files
echo "  Updating window titles and UI labels..."
find src/vs/workbench/contrib/void -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i '' "s/'Void'/'Resonance'/g" {} +
find src/vs/workbench/contrib/void -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec sed -i '' 's/"Void"/"Resonance"/g' {} +

# Update localization strings
if [ -d "src/vs/workbench/contrib/void/common/localization" ]; then
    echo "  Updating localization strings..."
    find src/vs/workbench/contrib/void/common/localization -type f -name "*.json" -exec sed -i '' 's/"Void"/"Resonance"/g' {} +
fi

# Update HTML files
echo "  Updating HTML files..."
find . -name "*.html" -type f -exec sed -i '' 's/>Void</>Resonance</g' {} +
find . -name "*.html" -type f -exec sed -i '' 's/title="Void"/title="Resonance"/g' {} +

# Update CSS comments and labels
echo "  Updating CSS files..."
find src/vs/workbench/contrib/void -name "*.css" -type f -exec sed -i '' 's/\/\* Void/\/* Resonance/g' {} +

# Update markdown documentation
echo "  Updating markdown files..."
find src/vs/workbench/contrib/void -name "*.md" -type f -exec sed -i '' 's/Void Editor/Resonance Editor/g' {} +
find src/vs/workbench/contrib/void -name "*.md" -type f -exec sed -i '' 's/Void AI/Resonance AI/g' {} +

# Update specific known user-facing strings
echo "  Updating specific UI strings..."

# Update settings labels
find src/vs/workbench/contrib/void -type f -name "*settings*.ts" -exec sed -i '' 's/Void Settings/Resonance Settings/g' {} +

# Update command labels
find src/vs/workbench/contrib/void -type f -name "*command*.ts" -exec sed -i '' 's/Void:/Resonance:/g' {} +

# Update notification messages
find src/vs/workbench/contrib/void -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/Void is/Resonance is/g' {} +
find src/vs/workbench/contrib/void -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/Void has/Resonance has/g' {} +

echo ""
echo "✅ Renaming complete!"
echo ""
echo "⚠️  Note: This script only updates user-facing text."
echo "   Technical identifiers (variable names, file paths, etc.) remain unchanged."
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes: git diff"
echo "   2. Build the project: npm run watch"
echo "   3. Test the application: ./scripts/code.sh"
echo ""
