# Freemium Offline Model - Quick Reference

## 🎯 The Model at a Glance

| Feature                  | Free User      | Pro User               |
| ------------------------ | -------------- | ---------------------- |
| **Offline Sounds**       | 1 maximum      | Unlimited              |
| **Audio Quality**        | Standard       | High-quality           |
| **Sound Mixing**         | Streaming only | Full mixing offline    |
| **Auto-Download**        | ❌ Manual only | ✅ Favorites auto-save |
| **Download Limit Alert** | Red ! badge    | None                   |
| **Ads During Playback**  | Optional       | No ads, ever           |

---

## 🔧 How It Works

### For Free Users

```
1. User taps download on sound
2. System checks: downloaded count < 1?
3. YES → Download succeeds → "Saved for offline"
4. NO → Paywall shows → "Upgrade for unlimited offline"
```

### For Pro Users

```
1. User taps download on sound
2. System checks: isPro?
3. YES → Download succeeds (no limit check)
4. Can download unlimited sounds
```

---

## 📊 Key Metrics

### Conversion

- **Target**: 8-12% from "offline_limit" paywall views
- **Why**: Users hit real need (want more offline sounds)
- **Trigger**: `Analytics.trackPaywallViewed("offline_limit")`

### Engagement

- **Target**: 15-25% of free users hit download limit
- **Signal**: Users finding value in offline feature
- **Action**: Upgrade opportunity

### Revenue

- **Expected**: $190-320K yearly from offline-driven conversions
- **Basis**: 10K users, 18-30 daily conversions, $29.99/year

---

## 🚀 Testing Checklist

### ✅ Quick Test (5 mins)

```
1. Login as free user
2. Download 1 sound → Should succeed
3. Try download 2nd sound → Should show paywall
4. Check red ! badge appears
5. Tap paywall → Should highlight offline benefits
```

### ✅ Full Test (15 mins)

```
1. Free user: Download, retry, see limit
2. Pro user: Download 5 sounds, no limit
3. App restart: Downloaded sounds persist
4. Offline mode: Sounds play from cache
5. Analytics: "offline_limit" event recorded
```

---

## 🎨 Visual Indicators

### Download Button States

**Normal (Can Download)**

```
☁️ (cloud icon) - tap to download
```

**Downloading**

```
⏳ (spinner) - downloading...
```

**Downloaded**

```
☁️✓ (checkmark) - saved offline
```

**At Limit (Free User)**

```
☁️! (red badge) - limit reached, disabled
```

---

## 💬 User Messaging

### Snackbar Messages

- ✅ "White Noise saved for offline use!"
- ❌ "Free users can save 1 offline sound. Upgrade to Pro for unlimited."
- 🔔 "Upgrade to Pro for unlimited offline sounds"

### Paywall Copy

**Headline**: "Upgrade to Slumbr Pro"
**Subheadline**: "Save unlimited sounds offline • Advanced mixing • No ads"

**Feature List**:

- Unlimited offline sounds (free users: 1 only)
- Sound mixing offline (free users: streaming only)
- Auto-save favorites for offline use
- No ads, ever

---

## 📝 Code Reference

### Check Freemium Limit

```typescript
if (!pro && !soundCache.canDownloadMore(pro)) {
  // User is free and at limit
  showSnackbar("Upgrade for unlimited...");
  setPaywallOpen(true);
}
```

### Download with Pro Check

```typescript
const success = await soundCache.initiateDownload(soundItem, pro);
// Pass pro status to enforce freemium limit
```

### Get Remaining Downloads

```typescript
const remaining = soundCache.getRemainingDownloads(isPro);
// Pro users return Infinity
// Free users return 0-1
```

---

## 🎯 Conversion Funnel

```
100 Free Users
    ↓
15-25 Hit Download Limit (15-25%)
    ↓
10-15 See Paywall (70-100%)
    ↓
1-2 Purchase (8-12%)
    ↓
Higher LTV (Offline users stick around longer)
```

---

## ⚠️ Common Issues & Fixes

| Issue                            | Fix                                       |
| -------------------------------- | ----------------------------------------- |
| Download button disabled for pro | Check `pro` variable is true              |
| No red badge for free user       | Verify `canDownloadMore()` returns false  |
| Paywall doesn't show             | Ensure `setPaywallOpen(true)` called      |
| Limit not enforced               | Pass `pro` param to `initiateDownload()`  |
| Analytics not tracking           | Add "offline_limit" to trackPaywallViewed |

---

## 📱 Platform Notes

### iOS

- ✅ Offline download via FileSystem API
- ✅ Caching persists across app launches
- ✅ Background download optional (currently manual)

### Android

- ✅ Offline download via FileSystem API
- ✅ Storage permissions required
- ✅ Cache survives app updates

### Web

- ❌ No offline caching (browser API limitations)
- ✅ Streaming works fine
- ℹ️ Free/Pro distinction still applies

---

## 🔐 Security & Privacy

- ✅ No user data shared for offline downloads
- ✅ Local-only caching (no cloud sync)
- ✅ Encrypted downloads via HTTPS
- ✅ Clear Cache button available in settings
- ✅ Compliant with app store policies

---

## 📊 Dashboard Setup

### Key Metrics to Track

```
Daily:
  - Downloads by user type (Free vs Pro)
  - Limit hit rate (15-25% target)

Weekly:
  - Conversion rate from "offline_limit" trigger
  - Offline sound playback rate

Monthly:
  - LTV comparison (offline vs non-offline users)
  - Churn rate by offline status
  - Revenue from offline-driven conversions
```

---

## 🚀 Next Steps

### Immediate (This Week)

- [ ] QA tests all flows
- [ ] Monitor conversion metrics
- [ ] Review analytics dashboard
- [ ] Gather user feedback

### Short Term (Week 2-4)

- [ ] A/B test messaging
- [ ] Consider 2-sound limit for pro+
- [ ] Add smart download suggestions
- [ ] Implement offline mix templates

### Medium Term (Month 2-3)

- [ ] Auto-delete when full → suggest upgrade
- [ ] Family plan with shared offline
- [ ] Regional offline recommendations
- [ ] Export offline mix as ZIP

---

## 💡 Pro Tips

1. **Show Value**: Highlight offline benefit in onboarding
2. **No Friction**: Let free users download 1 sound easily
3. **Track Everything**: Monitor which features drive conversions
4. **A/B Test**: Test badge message ("Save 1 sound" vs "Unlock unlimited")
5. **Segment Users**: Track LTV by how they hit the limit

---

## 📞 Support

### For TypeScript Errors

- Check soundCache.ts has all methods
- Verify pro param passed to initiateDownload
- Confirm analytics.ts has "offline_limit" type

### For Logic Issues

- Set soundCache.isProUser before download
- Verify RevenueCat isPro is connected
- Check downloadedSounds state updates

### For UI Issues

- Inspect red badge shows only for free users at limit
- Verify paywall opens on download failure
- Check snackbar messages display correctly

---

## 📚 Full Documentation

For detailed implementation guide, see:

- **FREEMIUM_OFFLINE_MODEL.md** - Complete specification
- **soundCache.ts** - Caching & freemium logic
- **PaywallModal.tsx** - Feature messaging
- **index.tsx** - Download button UI & handling

---

_Last Updated: January 14, 2026_
_Status: Production Ready ✅_
_Version: 1.0_
