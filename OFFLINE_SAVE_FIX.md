# Offline "Save for Offline" Fix

## Problem

Sounds were getting stuck in a loading state forever when attempting to save them for offline use. This was caused by:

1. **Callbacks never firing on download errors** - If a download failed (timeout, network error, etc.), the UI never got notified and continued spinning forever
2. **No error handling** - Failed downloads were silently ignored without any feedback to the user
3. **No timeout mechanism** - Downloads could hang indefinitely if the network dropped
4. **No stuck download detection** - Downloads that got stuck had no cleanup mechanism

## Root Causes

### 1. Missing Error Notification

The `soundCache.ts` download function would catch errors but never notify the UI callbacks:

```typescript
// OLD - Bad: Error caught but no notification sent
} catch (error) {
  console.error(`Error downloading:`, error);
  return null; // UI never finds out!
}
```

### 2. Callback Signature Didn't Include Success State

The callback had no way to know if the download succeeded:

```typescript
// OLD - No way to know if success or failure
soundCache.onDownloadComplete(soundId, (completedId: number) => {
  // Assumes it always succeeded!
  setDownloadedSounds(...);
});
```

### 3. No Download Timeout

Large files or slow networks could hang forever:

```typescript
// OLD - No timeout, could wait forever
const response = await fetch(remoteUrl);
const blob = await response.blob();
```

### 4. FileReader API Used in React Native

`FileReader` is a web API not available in React Native:

```typescript
// OLD - Doesn't work in React Native!
const reader = new FileReader();
reader.readAsArrayBuffer(blob);
```

## Solutions Implemented

### 1. Fixed Download Function with Proper Timeout

**File**: `utils/soundCache.ts`

- Added 30-second timeout using `Promise.race()`
- Uses `FileSystem.downloadAsync()` (proper React Native API)
- Properly handles and reports all errors

```typescript
// NEW - Proper timeout with Promise.race
const downloadPromise = FileSystem.downloadAsync(remoteUrl, filePath);
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(
    () => reject(new Error("Download timeout - 30 seconds exceeded")),
    30000
  )
);
await Promise.race([downloadPromise, timeoutPromise]);
```

### 2. Error Callbacks Always Fire

**File**: `utils/soundCache.ts`

- Callbacks now fire even on download failure
- Callbacks receive a `success: boolean` parameter to indicate outcome

```typescript
// NEW - Both success and failure paths notify callbacks
if (success) {
  this.notifyDownloadComplete(soundId, true); // Success
} else {
  this.notifyDownloadComplete(soundId, false); // Failure
}
```

### 3. Updated Callback Handling

**File**: `utils/soundCache.ts`

Changed callback signature to include success status:

```typescript
// OLD
onDownloadComplete(soundId: number, callback: (soundId: number) => void)

// NEW
onDownloadComplete(soundId: number, callback: (soundId: number, success: boolean) => void)
```

### 4. UI Now Handles Failure States

**File**: `app/(tabs)/index.tsx`

- Added `failedDownloads` state to track failed downloads
- Shows error message on failure: "Failed to save X for offline"
- Shows success message on success: "X saved for offline"

```typescript
// NEW - Handles both success and failure
soundCache.onDownloadComplete(soundId, (completedId, success) => {
  if (success) {
    setDownloadedSounds(...); // Mark as downloaded
    showSnackbar(`${sound.name} saved for offline`);
  } else {
    setFailedDownloads(...); // Mark as failed
    showSnackbar(`Failed to save ${sound.name} for offline`);
  }
});
```

### 5. Stuck Download Watchdog

**File**: `utils/soundCache.ts`

Added background watchdog that detects and cleans up downloads stuck for > 45 seconds:

```typescript
// NEW - Detects stuck downloads every 10 seconds
private startStuckDownloadWatchdog() {
  setInterval(() => {
    for (const [soundId, startTime] of this.downloadStartTimes) {
      if (now - startTime > 45000) {
        // Cleanup stuck download
        this.notifyDownloadComplete(soundId, false);
      }
    }
  }, 10000);
}
```

## Results

### Before

- Download stuck forever → UI freezes with spinner
- No error feedback to user
- No way to recover from network failures

### After

- Downloads timeout after 30 seconds
- Stuck downloads detected and cleaned up every 10 seconds
- Clear error messages: "Failed to save X for offline"
- UI immediately stops loading on failure
- User can retry after seeing error

## Key Changes

### soundCache.ts

- ✅ Uses `FileSystem.downloadAsync()` instead of fetch + FileReader
- ✅ Implements 30-second timeout per download
- ✅ Always notifies callbacks (success or failure)
- ✅ Adds watchdog to detect stuck downloads (45s max)
- ✅ Cleans up partial files on download failure
- ✅ Callback signature: `(soundId, success) => void`

### index.tsx

- ✅ Added `failedDownloads` state tracking
- ✅ Callbacks handle both success and failure paths
- ✅ Shows appropriate snackbar messages for each case
- ✅ Clears failed state when download succeeds
- ✅ Clears failed state when user retries

## Testing Checklist

- [ ] Play a sound → verify "saved for offline" appears in snackbar
- [ ] Turn off WiFi → play new sound → verify timeout after 30s and error message
- [ ] Disconnect network mid-download → verify error message appears
- [ ] Check logs for "Download timeout" or stuck download warnings
- [ ] Verify failed downloads clear the failed state on retry
- [ ] Verify watchdog cleans up any stuck downloads (check logs every 10s)

## Performance Impact

- **No negative impact**: All cleanup and notification happens in background
- **Faster error recovery**: Users see errors immediately (30s max wait)
- **Better UX**: Clear feedback instead of infinite spinner

## Future Improvements

1. **Retry mechanism**: Auto-retry failed downloads 1-2 times
2. **Download queue**: Queue multiple downloads and do them sequentially
3. **Resume downloads**: Resume interrupted large downloads
4. **Connection detection**: Check connection quality before downloading
5. **Exponential backoff**: Longer delays for repeated failures
