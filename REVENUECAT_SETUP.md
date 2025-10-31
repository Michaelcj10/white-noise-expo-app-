# RevenueCat Setup Instructions

## Overview

RevenueCat is now integrated into your white noise app. Follow these steps to complete the setup.

## 1. Create RevenueCat Account

1. Go to https://www.revenuecat.com/
2. Sign up for a free account
3. Create a new project

## 2. Configure App Stores

### For Android (Google Play):

1. In RevenueCat dashboard, go to **Project Settings** → **Google**
2. Follow the instructions to:
   - Create a service account in Google Play Console
   - Download the service account JSON key
   - Upload it to RevenueCat
3. Copy your **Google API Key** (starts with `goog_`)

### For iOS (App Store) - If/When Needed:

1. In RevenueCat dashboard, go to **Project Settings** → **Apple**
2. Follow the instructions to:
   - Connect your App Store Connect account
   - Configure your app bundle ID
3. Copy your **Apple API Key** (starts with `appl_`)

## 3. Create Products and Entitlements

### Create an Entitlement:

1. Go to **Entitlements** in RevenueCat dashboard
2. Click **+ New**
3. Create an entitlement called **"pro"** (exactly this name!)

### Create Products:

1. First, create products in Google Play Console:

   - Go to Google Play Console → Your App → Monetization → In-app products
   - Create subscription products (e.g., "pro_monthly", "pro_yearly")
   - Set pricing and subscription details

2. Then sync them in RevenueCat:
   - Go to **Products** in RevenueCat
   - Click **+ New**
   - Enter the product IDs from Google Play
   - Link them to the "pro" entitlement

### Create Offerings:

1. Go to **Offerings** in RevenueCat
2. Click **+ New**
3. Create a "Default" offering
4. Add your products to packages (e.g., "Monthly", "Annual")

## 4. Update API Keys in Code

Edit `contexts/revenuecat.tsx` and replace the placeholder keys:

```typescript
const REVENUECAT_API_KEY = Platform.select({
  ios: "appl_YOUR_IOS_KEY", // Replace with your actual iOS key
  android: "goog_YOUR_ANDROID_KEY", // Replace with your actual Android key
});
```

## 5. Update Android Build Config

Add RevenueCat to your `android/app/build.gradle` if needed (usually auto-configured):

```gradle
dependencies {
    implementation 'com.revenuecat.purchases:purchases:7.+'
}
```

## 6. Test the Integration

### Testing Purchases:

1. Use Google Play's **test tracks** and **license testing** accounts
2. Add test accounts in Google Play Console
3. Build and install your app on a test device
4. Try purchasing with a test account

### What Works Now:

- ✅ Premium sounds are gated behind Pro subscription
- ✅ "Upgrade to Pro" banner opens the paywall (only shows if not pro)
- ✅ Clicking premium sounds opens the paywall if user doesn't have pro
- ✅ Paywall shows available subscription plans
- ✅ "Restore Purchases" button for users who already paid
- ✅ PRO badge shows on premium sounds

## 7. Revenue Cat Free Tier

- Free up to $2,500 monthly tracked revenue
- Unlimited transactions
- All features included

## Testing Without Real Money

### Use RevenueCat Sandbox:

1. RevenueCat automatically works in sandbox mode during development
2. No need to spend real money for testing
3. Use Google Play's test accounts

### Grant Pro Access Manually (for testing):

You can temporarily grant Pro access by setting a user attribute:

1. Go to RevenueCat dashboard → Customers
2. Find your test user
3. Grant the "pro" entitlement manually

## Troubleshooting

### "No offerings available"

- Check that you created products in Google Play Console
- Verify products are synced to RevenueCat
- Make sure products are linked to the "pro" entitlement
- Check that offerings are published

### "Purchase failed"

- Ensure you're testing with a valid Google Play test account
- Check that billing is properly set up in Google Play Console
- Verify your service account has correct permissions

### App crashes on start

- Make sure API keys are correctly set
- Check that react-native-purchases is properly installed
- Rebuild the app: `npx expo run:android`

## Documentation Links

- RevenueCat Docs: https://www.revenuecat.com/docs
- Google Play Billing: https://developer.android.com/google/play/billing
- RevenueCat React Native Guide: https://www.revenuecat.com/docs/getting-started/installation/reactnative

## Next Steps

1. Set up your RevenueCat account
2. Configure Google Play billing
3. Update the API keys in the code
4. Test with a test account
5. Publish your app!
