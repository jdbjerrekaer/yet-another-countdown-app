#!/usr/bin/env python3
"""
Generate iOS splash screen images from app icon.
Creates splash screens with the app icon centered on background color #f8f8f8
"""

import sys
import os

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow (PIL) is required. Install with: pip3 install Pillow")
    sys.exit(1)

def create_splash_screen(icon_path, output_path, size=2732, icon_scale=0.65):
    """
    Create a splash screen image.
    
    Args:
        icon_path: Path to the app icon (1024x1024)
        output_path: Path to save the splash screen
        size: Size of the splash screen (2732x2732)
        icon_scale: Scale of icon relative to splash screen (0.45 = 45% of width)
    """
    # Background color #f8f8f8
    bg_color = (248, 248, 248)
    
    # Create background
    splash = Image.new('RGB', (size, size), bg_color)
    
    # Load and scale the app icon
    icon = Image.open(icon_path).convert('RGBA')
    icon_size = int(size * icon_scale)
    
    # Resize icon maintaining aspect ratio
    icon.thumbnail((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    # Calculate position to center the icon
    x = (size - icon.size[0]) // 2
    y = (size - icon.size[1]) // 2
    
    # Composite icon onto background
    splash.paste(icon, (x, y), icon)
    
    # Save the splash screen
    splash.save(output_path, 'PNG', optimize=True)
    print(f"Created splash screen: {output_path} ({size}x{size})")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    icon_path = os.path.join(project_root, 'new-app-icon.png')
    splash_dir = os.path.join(project_root, 'ios/App/App/Assets.xcassets/Splash.imageset')
    
    if not os.path.exists(icon_path):
        print(f"Error: App icon not found at {icon_path}")
        sys.exit(1)
    
    if not os.path.exists(splash_dir):
        print(f"Error: Splash directory not found at {splash_dir}")
        sys.exit(1)
    
    # Create all three splash images (all same size in this case)
    size = 2732
    
    splash_3x = os.path.join(splash_dir, 'splash-2732x2732.png')
    splash_2x = os.path.join(splash_dir, 'splash-2732x2732-1.png')
    splash_1x = os.path.join(splash_dir, 'splash-2732x2732-2.png')
    
    print("Generating splash screen images...")
    # Use larger scale (65%) to make the icon more prominent
    create_splash_screen(icon_path, splash_3x, size, icon_scale=0.65)
    create_splash_screen(icon_path, splash_2x, size, icon_scale=0.65)
    create_splash_screen(icon_path, splash_1x, size, icon_scale=0.65)
    
    print("\n✅ All splash screen images generated successfully!")

if __name__ == '__main__':
    main()
