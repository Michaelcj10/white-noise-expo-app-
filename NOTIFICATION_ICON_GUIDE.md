# Notification Icon Setup Guide

## What You Need to Know

Android notification icons have specific requirements:

- Must be a **white silhouette** on a transparent background
- Should be simple and recognizable at small sizes (24x24dp)
- Size: 96x96 pixels (for xxxhdpi density)

## Creating the Notification Icon

You have two options:

### Option 1: Use Your Existing App Icon (Simplified)

1. Open your `app-icon-android.png` in an image editor
2. Convert it to a white silhouette on transparent background
3. Simplify the design (remove details that won't show at small sizes)
4. Save as `notification-icon.png` in `assets/images/`

### Option 2: Use Android Asset Studio (Recommended)

1. Visit: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
2. Upload your app icon or use the clipart option
3. Configure:
   - Name: `ic_notification`
   - Color: White (#FFFFFF)
   - Trim: Yes
4. Download the generated files
5. Place the `ic_notification.png` files in your Android project:
   - `android/app/src/main/res/drawable-*/ic_notification.png`

## Current Setup

The notification icon will be automatically used by Android from your adaptive icon if not explicitly set. The current implementation:

1. ✅ Notification channel configured
2. ✅ Notification color set to brand color (#0A0903)
3. ✅ App name shows as "Slumbr"
4. ✅ Interruption handling enabled

## Testing

After adding the icon:

1. Rebuild the app: `npx expo run:android`
2. Play a sound
3. Check the notification in the status bar
4. The icon should appear as a white silhouette

## Production Build

To remove the green rim and use your final icon:

```bash
npx eas build --platform android --profile production
```

This will create a production APK without the development client border.
