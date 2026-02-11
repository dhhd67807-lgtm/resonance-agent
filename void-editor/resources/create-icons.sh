#!/bin/bash

# Script to generate app icons from SVG
# Requires: imagemagick (brew install imagemagick) and iconutil (macOS built-in)

echo "🎨 Creating Resonance app icons with Letterpress logo..."

SVG_FILE="resonance-icon-letterpress.svg"

# Create temp directory for icon generation
mkdir -p icon_temp

# Generate PNG files at various sizes for macOS .icns
echo "📱 Generating PNG files for macOS..."
convert -background none -resize 16x16 $SVG_FILE icon_temp/icon_16x16.png
convert -background none -resize 32x32 $SVG_FILE icon_temp/icon_16x16@2x.png
convert -background none -resize 32x32 $SVG_FILE icon_temp/icon_32x32.png
convert -background none -resize 64x64 $SVG_FILE icon_temp/icon_32x32@2x.png
convert -background none -resize 128x128 $SVG_FILE icon_temp/icon_128x128.png
convert -background none -resize 256x256 $SVG_FILE icon_temp/icon_128x128@2x.png
convert -background none -resize 256x256 $SVG_FILE icon_temp/icon_256x256.png
convert -background none -resize 512x512 $SVG_FILE icon_temp/icon_256x256@2x.png
convert -background none -resize 512x512 $SVG_FILE icon_temp/icon_512x512.png
convert -background none -resize 1024x1024 $SVG_FILE icon_temp/icon_512x512@2x.png

# Create .iconset directory for macOS
echo "🍎 Creating macOS .icns file..."
mkdir -p icon_temp/Resonance.iconset
cp icon_temp/icon_16x16.png icon_temp/Resonance.iconset/
cp icon_temp/icon_16x16@2x.png icon_temp/Resonance.iconset/
cp icon_temp/icon_32x32.png icon_temp/Resonance.iconset/
cp icon_temp/icon_32x32@2x.png icon_temp/Resonance.iconset/
cp icon_temp/icon_128x128.png icon_temp/Resonance.iconset/
cp icon_temp/icon_128x128@2x.png icon_temp/Resonance.iconset/
cp icon_temp/icon_256x256.png icon_temp/Resonance.iconset/
cp icon_temp/icon_256x256@2x.png icon_temp/Resonance.iconset/
cp icon_temp/icon_512x512.png icon_temp/Resonance.iconset/
cp icon_temp/icon_512x512@2x.png icon_temp/Resonance.iconset/

# Convert to .icns (macOS only)
if command -v iconutil &> /dev/null; then
    iconutil -c icns icon_temp/Resonance.iconset -o darwin/code.icns
    echo "✅ Created darwin/code.icns"
else
    echo "⚠️  iconutil not found (macOS only). Skipping .icns creation."
fi

# Generate Windows .ico file
echo "🪟 Creating Windows .ico file..."
if command -v convert &> /dev/null; then
    convert icon_temp/icon_16x16.png icon_temp/icon_32x32.png icon_temp/icon_48x48.png icon_temp/icon_256x256.png win32/code.ico
    echo "✅ Created win32/code.ico"
else
    echo "⚠️  ImageMagick not found. Please install: brew install imagemagick"
fi

# Generate Linux PNG
echo "🐧 Creating Linux PNG..."
convert -background none -resize 512x512 $SVG_FILE linux/code.png
echo "✅ Created linux/code.png"

# Generate additional Windows installer images
echo "🖼️  Creating Windows installer images..."
convert -background none -resize 150x150 $SVG_FILE win32/code_150x150.png
convert -background none -resize 70x70 $SVG_FILE win32/code_70x70.png

# Generate server icons
echo "🌐 Creating server icons..."
convert -background none -resize 192x192 $SVG_FILE server/code-192.png
convert -background none -resize 512x512 $SVG_FILE server/code-512.png
convert -background none -resize 32x32 $SVG_FILE server/favicon.ico

echo ""
echo "✨ Icon generation complete!"
echo "📁 Icons saved to:"
echo "   - darwin/code.icns (macOS)"
echo "   - win32/code.ico (Windows)"
echo "   - linux/code.png (Linux)"
echo ""
echo "🧹 Cleaning up temporary files..."
rm -rf icon_temp

echo "✅ Done!"
