# RevenueCat Quick Start - Slumbr

## 🚀 Quick Setup (5 Minutes)

### 1. RevenueCat Dashboard Setup

1. **Login**: https://app.revenuecat.com
2. **Create Project** (if not exists)
3. **Get API Key**: Already configured → `test_eTsZgLkXYPzfShLHWZYItgPVmqu`

### 2. Create Products

Go to **Products** tab and create:

| Product ID | Type           | Display Name        |
| ---------- | -------------- | ------------------- |
| `monthly`  | Subscription   | Slumbr Pro Monthly  |
| `yearly`   | Subscription   | Slumbr Pro Yearly   |
| `lifetime` | Non-consumable | Slumbr Pro Lifetime |

### 3. Create Offering

1. Go to **Offerings** tab
2. Create offering: `default`
3. Add all 3 products
4. Make it current

### 4. Create Entitlement

1. Go to **Entitlements** tab
2. Create: `slumbr Pro`
3. Attach all 3 products

### 5. Link Store

**iOS**: Add bundle ID + App Store Connect credentials
**Android**: Add package name + Google Play credentials

---

## 📱 Test Purchases

### iOS Sandbox Testing

```bash
# 1. Create sandbox tester in App Store Connect
# 2. Sign out of App Store on device
# 3. Run app
# 4. Make purchase → sign in with sandbox account
```

### Android Testing

```bash
# 1. Add testers in Google Play Console
# 2. Upload to internal testing track
# 3. Testers install and purchase
```

---

## 🧪 Quick Test Flow

1. **Run app**: `npx expo start`
2. **Try premium sound**: Tap any premium sound with PRO badge
3. **See paywall**: Modal appears with pricing
4. **Make test purchase**: Select package (use sandbox account)
5. **Success**: Premium features unlock immediately
6. **Check settings**: See "Slumbr Pro Active" card

---

## 📝 Code Locations

| Feature           | File                          | Line    |
| ----------------- | ----------------------------- | ------- |
| RevenueCat Setup  | `contexts/revenuecat.tsx`     | All     |
| Paywall UI        | `components/PaywallModal.tsx` | All     |
| Settings Pro Card | `app/(tabs)/settings.tsx`     | ~450    |
| Premium Gating    | `app/(tabs)/index.tsx`        | Various |

---

## 🔑 Key Configuration

```typescript
// contexts/revenuecat.tsx
const REVENUECAT_CONFIG = {
  apiKey: "test_eTsZgLkXYPzfShLHWZYItgPVmqu",
  entitlementId: "slumbr Pro", // Must match dashboard
};
```

---

## ✅ Checklist Before Launch

- [ ] Products created in App Store Connect / Google Play
- [ ] Products configured in RevenueCat dashboard
- [ ] Offering created and set as current
- [ ] Entitlement "slumbr Pro" created
- [ ] All products attached to entitlement
- [ ] Test purchase works in sandbox
- [ ] Restore purchases works
- [ ] Pro features unlock correctly
- [ ] Settings shows pro status
- [ ] Replace test API key with production key

---

## 🆘 Quick Fixes

**No offerings showing?**
→ Check RevenueCat dashboard has "default" offering set as current

**Purchase fails?**
→ Verify sandbox account is signed in (iOS) or app is from internal testing (Android)

**Still locked after purchase?**
→ Check entitlement ID is exactly "slumbr Pro" (case sensitive)

**Can't restore?**
→ User must use same Apple/Google account as original purchase

---

## 📊 Monitor Success

**RevenueCat Dashboard**:

- Active subscriptions
- Revenue graphs
- Customer list
- Events log

**App Logs**:

```
✅ RevenueCat SDK initialized successfully
📦 Loaded offerings: 3 packages
✨ Pro access granted
```

---

## 🎯 Next Actions

1. Configure products in store
2. Test all purchase flows
3. Update to production API key
4. Launch and monitor dashboard!

---

For full documentation, see `REVENUECAT_INTEGRATION.md`
