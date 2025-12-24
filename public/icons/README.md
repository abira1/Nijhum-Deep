# App Icons

This directory contains the app icons for the Nijhum Dip PWA in various sizes.

## ✅ Available Icons

### Core PWA Icons
- **icon-192.png**: 192x192 - Standard Android Chrome icon
- **icon-192-maskable.png**: 192x192 - Maskable version for adaptive icons
- **icon-512.png**: 512x512 - High-resolution icon for splash screens
- **icon-512-maskable.png**: 512x512 - Maskable high-resolution icon
- **apple-touch-icon.png**: 180x180 - iOS Safari touch icon
- **favicon.ico**: Multi-size favicon for browsers
- **play_store_512.png**: 512x512 - Google Play Store icon

### iOS App Icons (Complete Set)
- **AppIcon-20@2x.png**: 40x40
- **AppIcon-20@3x.png**: 60x60
- **AppIcon-29.png**: 29x29
- **AppIcon-29@2x.png**: 58x58
- **AppIcon-29@3x.png**: 87x87
- **AppIcon-40@2x.png**: 80x80
- **AppIcon-40@3x.png**: 120x120
- **AppIcon@2x.png**: 120x120
- **AppIcon@3x.png**: 180x180
- **AppIcon-83.5@2x~ipad.png**: 167x167
- **AppIcon~ios-marketing.png**: 1024x1024

### iPad Specific Icons
- **AppIcon-20~ipad.png**: 20x20
- **AppIcon-20@2x~ipad.png**: 40x40
- **AppIcon-29~ipad.png**: 29x29
- **AppIcon-29@2x~ipad.png**: 58x58
- **AppIcon-40~ipad.png**: 40x40
- **AppIcon-40@2x~ipad.png**: 80x80
- **AppIcon@2x~ipad.png**: 152x152
- **AppIcon~ipad.png**: 76x76

### CarPlay Icons
- **AppIcon-60@2x~car.png**: 120x120
- **AppIcon-60@3x~car.png**: 180x180

## Icon Usage

### Web App Manifest
The manifest.json uses:
- `icon-192.png` and `icon-192-maskable.png` for standard display
- `icon-512.png` and `icon-512-maskable.png` for high-resolution displays
- `apple-touch-icon.png` for iOS compatibility
- `play_store_512.png` for app store listings

### HTML Meta Tags
The index.html references:
- `apple-touch-icon.png` for iOS home screen
- `favicon.ico` for browser tabs
- `icon-192.png` and `icon-512.png` for general favicon usage

### Service Worker
The service worker caches all core PWA icons for offline availability.

## Current Status

✅ **COMPLETE**: All required icon files are available and configured
✅ **INTEGRATED**: Icons are properly referenced in manifest.json, index.html, and service worker
✅ **OPTIMIZED**: Includes both regular and maskable versions for adaptive icons

## Icon Quality

- **Source**: Generated from the official Nijhum Dip logo
- **Format**: PNG with transparency support
- **Quality**: High-resolution, optimized for web delivery
- **Compatibility**: Supports all major platforms (iOS, Android, Windows, Web)

## Testing

To verify icons are working correctly:
1. Check manifest.json loads without errors in DevTools
2. Test "Add to Home Screen" functionality
3. Verify icons appear correctly on installed app
4. Check favicon displays in browser tabs
5. Test on multiple devices and platforms
