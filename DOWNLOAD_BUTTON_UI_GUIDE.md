# New Feature: Manual Download Button - UI Guide

## Sound Card Layout

### Before (Auto-Download Era)

```
┌─────────────────────────────────────────┐
│ [Icon] Sound Name    [♡ or 💜 or ✓]      │
│        Description                       │
└─────────────────────────────────────────┘
```

### After (Manual Download)

```
┌─────────────────────────────────────────┐
│ [Icon] Sound Name    [⬇️] [♡ or 💜]      │  ← Not downloaded: Download button appears
│        Description                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [Icon] Sound Name    [⌛] [♡ or 💜]      │  ← Downloading: Loading spinner
│        Description                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [Icon] Sound Name    [✓] [♡ or 💜]      │  ← Downloaded: Green checkmark only
│        Description                       │
└─────────────────────────────────────────┘
```

## Button States

### Cloud Download Button (Not Downloaded)

- **Icon**: `cloud-download-outline`
- **Color**: Theme primary color (usually blue)
- **Action**: Tap to download
- **Shows for**: Remote sounds (Fan, Fridge, Hair Dryer, etc.)
- **Hidden for**: Local sounds (White Noise, Rain, Ocean)

### Loading Spinner (Downloading)

- **Shows**: While download is in progress
- **Color**: Theme primary color
- **Disabled**: Cannot tap to prevent duplicate downloads
- **Disappears**: When download completes

### Download Done Checkmark (Downloaded)

- **Icon**: `cloud-done`
- **Color**: Green (#10b981)
- **Shows**: After successful download
- **Persistent**: Shows until app cache is cleared

## User Workflow

### Scenario 1: Stream a Sound (No Download)

```
1. User taps sound card (e.g., "Fan")
2. Sound plays immediately (streamed from internet)
3. Cloud download button visible on the card
4. Sound stops when app closes if "Background Play" is off
```

### Scenario 2: Download for Offline Use

```
1. User taps cloud download button on sound card
2. Button shows loading spinner
3. App downloads sound to device storage
4. Snackbar shows: "Fan saved for offline use!"
5. Button replaced with green checkmark
6. Sound available offline even if internet is gone
7. Sound persists even after app closes
```

### Scenario 3: Mixer with Downloaded Sounds

```
1. User opens mixer modal
2. Can mix downloaded and streamed sounds together
3. Downloaded sounds play instantly
4. Streamed sounds load while playing
5. Individual volume control for each sound
6. Pause/Resume/Stop controls for all sounds
```

## Sound Indicators

### Green Checkmark (✓)

- Indicates sound has been downloaded
- Shows on the right side of sound name
- Cannot be clicked
- Persists until cache is cleared

### Download Button (⬇️)

- Only shows for sounds NOT yet downloaded
- Clickable/tappable
- Shows loading spinner during download
- Disappears once download completes

### Local Sounds (No Button)

- White Noise
- Rain
- Ocean

These three sounds come bundled with the app and don't need downloading. They're always available.

## Feedback Messages

### Download Success

```
✅ "Fan saved for offline use!"
```

- Duration: 3-4 seconds
- Shows at bottom of screen
- Automatically dismisses

### Download Failed

```
❌ "Failed to download Fan"
```

- Appears if:
  - Network connection lost
  - Download timeout (30 seconds)
  - Device storage full
  - Invalid URL
- User can retry by tapping download button again

## Download Progress

Currently, downloads don't show a progress bar or percentage, but the UI clearly indicates:

- **Not started**: Cloud download icon visible
- **In progress**: Loading spinner visible
- **Complete**: Green checkmark visible
- **Failed**: Download button reappears, user can retry

## Audio Fade Effects (User Experience)

### When Playing

```
Volume curve:
   ▲
   │     ╱─────────
   │    ╱
 0 └───┴────────────→ Time
   0   1.5s  (fade in, default 1.5 seconds)

Sound gradually gets louder - no audio click
```

### When Pausing

```
Volume curve:
   ▲  ─────╲
   │       ╲
   │        ╲
 0 └────────┴──────→ Time
   0        1s  (fade out)

Sound gradually gets quieter - smooth transition
```

### When Stopping

```
Same as pause - sound fades out before stopping
```

## Statistics Shown in Mixer

When mixer modal is open, you can see:

- Number of active sounds playing
- Individual volume level for each sound (0-100%)
- Sound name and icon
- Favorite status for each sound
- Add/remove individual sounds

## Advanced: What Gets Cached?

### Downloaded (Cached Locally)

- Remote sound files (stored in app's cache directory)
- Metadata (downloaded date, file size)
- Survives app restart
- Deleted when:
  - User clears app cache
  - Manually removed via settings
  - Device runs out of storage (system cleanup)

### Streamed (Not Cached)

- Played directly from internet
- No disk space used
- Lost if internet drops
- Requires data/WiFi

## Size Considerations

Typical sound file sizes:

- Single sound: 2-5 MB
- 10 sounds downloaded: 20-50 MB
- 20 sounds downloaded: 40-100 MB

Users can manage downloads via:

- Storage settings (see cache size)
- Selective downloading (only download favorite sounds)
- Clear cache option (remove all downloads)

## Future Enhancements

Possible additions:

1. Download progress percentage
2. Batch download (all sounds in category)
3. Auto-download when WiFi available
4. Download queue management
5. Sort sounds by "downloaded" status
6. Storage indicator (X MB used of Y MB available)
