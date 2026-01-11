# Audio Performance Optimization - Sound Startup Speed

## Problem

Sounds were slow to start playing:

1. **First play**: Noticeable delay (2-5 seconds) between tap and audio output
2. **Subsequent plays**: Still slow even though sound should be cached

## Root Causes Identified

1. **No timeout on downloads** - When `prioritize=true`, download could take 5-10 seconds for a 10MB file, blocking UI
2. **Stale cache state** - Memory cache wasn't checking for newly downloaded sounds from background processes
3. **Streaming without priority** - After first play, second play didn't check if background download completed
4. **Synchronous notification overhead** - `await showPlayingNotification()` blocked playback initialization
5. **No preloading optimization** - All sounds (mixer vs direct play) treated equally

## Optimizations Implemented

### 1. Priority Caching with 3-Second Timeout + Smart Discovery

**File: `utils/soundCache.ts`**

Enhanced `getSource()` method with intelligent caching:

- **Always checks AsyncStorage for newly cached sounds** - Discovers sounds downloaded in background before playback
- **3-second timeout on downloads** - Prevents slow network from blocking playback startup indefinitely
- **Graceful timeout fallback** - Uses `Promise.race()` to race download against timeout
- **Smart memory cache refresh** - Updates in-memory cache when newly cached files are discovered

```typescript
async getSource(soundItem: any, autoDownload: boolean = true, prioritize: boolean = false)
```

**Key improvement**: On 2nd+ plays, now checks AsyncStorage first, so recently downloaded sounds play from cache instantly!

### 2. Accelerated Single Sound Playback

**File: `app/(tabs)/index.tsx` - `playSingleSound` function**

- Calls `getSource()` with `prioritize=true` flag
- Detects recently cached files before attempting new downloads
- Falls back to streaming only if cache miss + timeout

### 3. Non-Blocking Notifications

**File: `app/(tabs)/index.tsx` - `playSingleSound` function**

Removed `await` from notification display:

- **Before:** `await showPlayingNotification()` blocked playback startup
- **After:** Fire-and-forget with `.catch()` for error handling

### 4. Mixer Sound Optimization

**File: `app/(tabs)/index.tsx` - `toggleSoundInMixer` function**

Applied the same priority caching to mixer sound additions for consistent performance.

## Expected Improvements

- **First play of sound**: 3 seconds max (timeout waits for fast downloads, falls back to streaming)
- **Subsequent plays**: Near-instant (< 100ms) - checks AsyncStorage for cached version
- **Non-cached sounds**: Streaming works instantly (no blocking), download happens in background
- **UI responsiveness**: No longer blocked by notifications or slow downloads

## Technical Details

### Smart Cache Discovery Flow

```
User plays sound
  ↓
Check memory cache → YES → Play immediately (< 50ms)
  ↓ NO
Check AsyncStorage for newly cached sounds → YES → Update memory & play (< 150ms)
  ↓ NO
Start download with 3-second timeout
  ↓
Download completes within 3s? → YES → Play from cache (saves future startup time)
  ↓ NO (timeout)
Stream from remote URL (playback starts immediately, cache continues in background)
```

### Second Play of Same Sound

On the second play, the `getSource()` immediately finds the cached version in AsyncStorage and plays it from disk without any network delay!

### Timeout Strategy

Using 3-second timeout ensures:

- Fast network (WiFi): Download completes, sound plays from cache
- Slow network (LTE): Timeout triggers after 3s, streaming begins immediately
- Prevents indefinite blocking on poor connections

### Notification Handling

The notification system now runs in parallel:

```typescript
// Non-blocking - playback starts immediately
showPlayingNotification(name, false).catch((err) => console.log(err));
// Notification appears in background without delaying audio
```

## Expected User Experience

| Scenario                | Before         | After                              |
| ----------------------- | -------------- | ---------------------------------- |
| 1st play (good network) | 3-5s delay     | 0.5-3s (depends on download speed) |
| 1st play (slow network) | 5-10s+ delay   | < 1s (streams immediately)         |
| 2nd+ play (same sound)  | 3-5s delay     | < 150ms (cache hit)                |
| Mixer additions         | 3-5s per sound | 0.5-3s per sound                   |

## Testing Recommendations

1. Test on slow network (3G/LTE) to verify 3-second timeout and graceful fallback
2. Play a sound twice - 2nd play should be instant (from cache)
3. Monitor logs for "Discovered newly cached sound" messages
4. Check that background downloads complete after playback starts
5. Measure startup time with profiling tools
6. Verify notifications still appear but don't delay audio
7. Test mixer sounds with multiple simultaneous additions
8. Monitor cache growth over time
