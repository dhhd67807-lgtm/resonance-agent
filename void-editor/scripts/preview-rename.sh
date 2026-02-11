#!/bin/bash

# Preview script to show what will be renamed from Void to Resonance

echo "🔍 Preview: Files that will be updated..."
echo ""

echo "📝 Files containing 'Void Agent':"
grep -r "Void Agent" void-editor/src/vs/workbench/contrib/void --include="*.ts" --include="*.tsx" --include="*.js" | head -20

echo ""
echo "📝 Files containing quoted 'Void':"
grep -r "'Void'" void-editor/src/vs/workbench/contrib/void --include="*.ts" --include="*.tsx" --include="*.js" | head -20

echo ""
echo "📝 Files containing double-quoted \"Void\":"
grep -r '"Void"' void-editor/src/vs/workbench/contrib/void --include="*.ts" --include="*.tsx" --include="*.js" | head -20

echo ""
echo "📝 Package.json entries:"
grep -n "Void" void-editor/package.json 2>/dev/null || echo "  (none found)"

echo ""
echo "📝 README files:"
find void-editor -name "README.md" -type f -exec grep -l "Void" {} \; 2>/dev/null || echo "  (none found)"

echo ""
echo "ℹ️  This is a preview. Run ./scripts/rename-to-resonance.sh to apply changes."
echo ""
