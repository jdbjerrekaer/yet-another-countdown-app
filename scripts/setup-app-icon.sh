#!/bin/bash

# iOS App Icon Setup Script
# Usage: ./scripts/setup-app-icon.sh [path-to-your-icon.png]

set -e

ICON_PATH="${1:-new-app-icon.png}"
TARGET_PATH="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

if [ ! -f "$ICON_PATH" ]; then
    echo "❌ Error: Icon file not found: $ICON_PATH"
    echo ""
    echo "Usage: ./scripts/setup-app-icon.sh [path-to-your-icon.png]"
    echo ""
    echo "Example: ./scripts/setup-app-icon.sh ~/Downloads/my-icon.png"
    exit 1
fi

echo "📱 Setting up iOS app icon..."
echo "   Source: $ICON_PATH"
echo "   Target: $TARGET_PATH"
echo ""

# Get current dimensions
CURRENT_SIZE=$(sips -g pixelWidth -g pixelHeight "$ICON_PATH" 2>/dev/null | grep -E "pixelWidth|pixelHeight" | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
echo "   Current size: ${CURRENT_SIZE}"

# Resize to 1024x1024 (maintains aspect ratio, centers content)
echo "   Resizing to 1024×1024..."
sips -z 1024 1024 "$ICON_PATH" --out "$TARGET_PATH" > /dev/null 2>&1

# Verify final dimensions
FINAL_SIZE=$(sips -g pixelWidth -g pixelHeight "$TARGET_PATH" 2>/dev/null | grep -E "pixelWidth|pixelHeight" | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
echo "   Final size: ${FINAL_SIZE}"

if [ "$FINAL_SIZE" = "1024x1024" ]; then
    echo ""
    echo "✅ App icon successfully set up!"
    echo ""
    echo "Next steps:"
    echo "1. Open Xcode: open ios/App/App.xcworkspace"
    echo "2. Navigate to Assets.xcassets → AppIcon"
    echo "3. Verify the icon appears correctly"
    echo "4. Rebuild your app"
else
    echo ""
    echo "⚠️  Warning: Final size is ${FINAL_SIZE}, expected 1024x1024"
    echo "   The icon may not display correctly. Please check the source image."
fi
