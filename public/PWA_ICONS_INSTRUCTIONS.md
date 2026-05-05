# PWA Icons Setup Instructions

## Required Icon Files

You need to create the following icon files in the `public/` directory:

### 1. **icon-192.png** (192x192 pixels)
- Square icon with your GOSH PERFUME logo
- Transparent or white background
- PNG format
- Used for Android home screen

### 2. **icon-512.png** (512x512 pixels)
- Square icon with your GOSH PERFUME logo
- Transparent or white background
- PNG format
- Used for Android splash screen and app drawer

### 3. **apple-icon.png** (180x180 pixels)
- Square icon with your GOSH PERFUME logo
- Solid background (no transparency)
- PNG format
- Used for iOS home screen

### 4. **favicon.ico** (32x32 pixels)
- Small icon for browser tabs
- ICO format
- Place in `app/` directory (not `public/`)

### 5. **screenshot-mobile.png** (390x844 pixels)
- Screenshot of your mobile website
- PNG format
- Shows product listing or home page

### 6. **screenshot-desktop.png** (1920x1080 pixels)
- Screenshot of your desktop website
- PNG format
- Shows product listing or home page

## How to Create Icons

### Option 1: Use Online Tools
1. Go to https://realfavicongenerator.net/
2. Upload your logo (at least 512x512px)
3. Download all generated icons
4. Place them in the correct directories

### Option 2: Use Design Software
1. Open your logo in Photoshop/Figma/Canva
2. Resize to required dimensions
3. Export as PNG with appropriate settings
4. Save to `public/` directory

### Option 3: Use PWA Asset Generator
```bash
npm install -g pwa-asset-generator
pwa-asset-generator your-logo.png public/ --icon-only
```

## Quick Setup (Temporary)

If you don't have icons ready, you can use your existing logo:

1. Find your logo file (e.g., `public/images/gosh-circle-logo.png`)
2. Resize it to 512x512px
3. Save as `public/icon-512.png`
4. Resize to 192x192px
5. Save as `public/icon-192.png`
6. Resize to 180x180px
7. Save as `public/apple-icon.png`

## Verification

After adding icons, test your PWA:

1. Open your site in Chrome
2. Open DevTools (F12)
3. Go to "Application" tab
4. Check "Manifest" section
5. Verify all icons are loaded correctly

## Install Prompt

Users can install your PWA by:
- **Android Chrome**: Tap "Add to Home Screen" in menu
- **iOS Safari**: Tap Share → "Add to Home Screen"
- **Desktop Chrome**: Click install icon in address bar

Your PWA will work like a native app!
