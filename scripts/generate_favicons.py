#!/usr/bin/env python3
"""
Generate favicon files from app store icons.
Creates all necessary favicon sizes for web, iOS, and Android.
"""

import sys
import os

try:
    from PIL import Image
except ImportError:
    print("Pillow (PIL) is required. Install with: pip3 install Pillow")
    sys.exit(1)

def resize_icon(icon_path, output_path, size):
    """
    Resize an icon to the specified size.
    
    Args:
        icon_path: Path to the source icon
        output_path: Path to save the resized icon
        size: Target size (width and height)
    """
    icon = Image.open(icon_path).convert('RGBA')
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(output_path, 'PNG', optimize=True)
    print(f"Created icon: {output_path} ({size}x{size})")

def create_favicon_ico(icon_path, output_path):
    """
    Create a favicon.ico file from the icon.
    ICO files can contain multiple sizes, but we'll create a simple 32x32 version.
    
    Args:
        icon_path: Path to the source icon
        output_path: Path to save the .ico file
    """
    icon = Image.open(icon_path).convert('RGBA')
    # Resize to 32x32 for favicon.ico
    icon = icon.resize((32, 32), Image.Resampling.LANCZOS)
    # Convert RGBA to RGB for ICO format (ICO doesn't support transparency well)
    # Create a white background
    background = Image.new('RGB', (32, 32), (255, 255, 255))
    background.paste(icon, mask=icon.split()[3] if icon.mode == 'RGBA' else None)
    background.save(output_path, format='ICO', sizes=[(32, 32)])
    print(f"Created favicon.ico: {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    public_dir = os.path.join(project_root, 'public')
    
    icon_light_path = os.path.join(project_root, 'Icon-Light-1024x1024.png')
    icon_dark_path = os.path.join(project_root, 'Icon-Dark-1024x1024.png')
    
    if not os.path.exists(icon_light_path):
        print(f"Error: Light app icon not found at {icon_light_path}")
        sys.exit(1)

    if not os.path.exists(icon_dark_path):
        print(f"Error: Dark app icon not found at {icon_dark_path}")
        sys.exit(1)
    
    if not os.path.exists(public_dir):
        print(f"Error: Public directory not found at {public_dir}")
        sys.exit(1)
    
    print("Generating favicon files...")
    
    # Generate favicon sizes (light versions)
    sizes = [16, 32, 48]
    for size in sizes:
        output_path = os.path.join(public_dir, f'favicon-{size}x{size}.png')
        resize_icon(icon_light_path, output_path, size)
    
    # Generate dark favicon sizes
    for size in sizes:
        output_path = os.path.join(public_dir, f'favicon-{size}x{size}-dark.png')
        resize_icon(icon_dark_path, output_path, size)
    
    # Generate favicon.ico (using light version)
    favicon_ico_path = os.path.join(public_dir, 'favicon.ico')
    create_favicon_ico(icon_light_path, favicon_ico_path)
    
    # Generate apple-touch-icon.png (180x180, using light version)
    apple_touch_icon_path = os.path.join(public_dir, 'apple-touch-icon.png')
    resize_icon(icon_light_path, apple_touch_icon_path, 180)
    
    # Generate Android Chrome icons (using light version)
    android_192_path = os.path.join(public_dir, 'android-chrome-192x192.png')
    resize_icon(icon_light_path, android_192_path, 192)
    
    android_512_path = os.path.join(public_dir, 'android-chrome-512x512.png')
    resize_icon(icon_light_path, android_512_path, 512)
    
    print("\n✅ All favicon files generated successfully!")

if __name__ == '__main__':
    main()
