# RevenueCat API Key Initialization Failure Analysis

## Problem

RevenueCat SDK initialization fails with an API key error on first app launch, but works in subsequent runs.

## Root Causes Identified

### 1. **Network Timing Issues (Most Common)**

- The app might be initializing before network connectivity is fully established
- On cold app start, network might not be ready
- Solution: Added retry logic with exponential backoff

### 2. **SDK Initialization Race Condition**

- `Purchases.configure()` might not complete before subsequent API calls
- First time initialization requires additional SDK setup
- The SDK might need a moment to be fully ready after configuration

### 3. **Test API Key Behavior**

- Test API keys (`test_eTsZgLkXYPzfShLHWZYItgPVmqu`) require proper Purchases SDK initialization
- First request might fail if SDK isn't fully ready
- Current implementation has this test key for both Android and iOS

### 4. **Platform-Specific Issues**

- Android might require additional setup time
- iOS might have different initialization timing

## Current API Key Configuration

```typescript
const REVENUECAT_API_KEYS = {
  android: "test_eTsZgLkXYPzfShLHWZYItgPVmqu",
  ios: "test_eTsZgLkXYPzfShLHWZYItgPVmqu",
};
```

## Solutions Implemented

### 1. **Enhanced Detailed Logging**

Added comprehensive logs to track:

- When initialization starts
- Platform and API key presence
- Each step of the initialization process
- Specific error types and messages
- Retry attempts

```typescript
console.log("🚀 Starting RevenueCat initialization...");
console.log("📱 Platform:", Platform.OS);
console.log(
  "🔑 API Key:",
  REVENUECAT_CONFIG.apiKey ? "✓ Present" : "✗ Missing"
);
```

### 2. **Automatic Retry Mechanism**

- Retries up to 3 times on API key validation errors
- 2-second delay between retries
- Detects specific error messages: "Invalid API key", "401", "Unauthorized"
- Falls back to offline mode after max retries

```typescript
if (
  retryCount < MAX_RETRIES &&
  (error?.message?.includes("Invalid API key") ||
    error?.message?.includes("401") ||
    error?.message?.includes("Unauthorized"))
) {
  console.log(`⏳ Retrying initialization in 2 seconds...`);
  setTimeout(() => setRetryCount(retryCount + 1), 2000);
}
```

### 3. **Better Error Context**

Detailed error information for debugging:

```typescript
console.error("   Error type:", error?.name || typeof error);
console.error("   Error message:", error?.message || error);
console.error("   Full error:", error);
```

### 4. **Fallback Graceful Degradation**

- App operates in offline/free mode if initialization fails
- Users can restore purchases when they go online
- No blocking UI elements waiting for RevenueCat

## What to Monitor

When you run the app, look for these logs:

1. `🚀 Starting RevenueCat initialization...` - Start of init
2. `📱 Platform:` - Confirms correct platform
3. `🔑 API Key: ✓ Present` - Confirms API key is loaded
4. `⚙️ Configuring Purchases with API key...` - About to configure
5. `✅ RevenueCat SDK initialized successfully` - Success!
6. Or: `⏳ Retrying initialization...` - If retrying
7. Or: `✈️ Operating in offline/free mode` - If all retries failed

## Next Steps If Still Failing

If you still see API key errors after these improvements:

1. **Verify API Key**
   - Check that `REVENUECAT_API_KEYS` has correct keys
   - Consider using production keys instead of test keys
   - Verify keys are enabled in RevenueCat dashboard

2. **Check Network**
   - Ensure app has proper network permissions
   - Test with WiFi on
   - Check if offline mode error is being triggered

3. **SDK Version**
   - Current: `react-native-purchases@9.6.3`
   - Check if update available: `npm info react-native-purchases`

4. **Platform-Specific Setup**
   - For iOS: Check CocoaPods installation
   - For Android: Check gradle build and plugin configuration

5. **Environment Variables**
   - Consider moving API key to environment variable
   - Don't hardcode test keys in production

## Code Location

- Main context: `contexts/revenuecat.tsx`
- Provider setup: `app/_layout.tsx`
- Configuration object: Lines 10-20 of revenuecat.tsx
