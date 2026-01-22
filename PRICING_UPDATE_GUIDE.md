# Pricing Update Guide - $3.99/Month & $29.99 Lifetime

## Quick Summary
- **Monthly**: $3.99/month
- **Lifetime**: $29.99 (one-time)

---

## How to Update Pricing in RevenueCat

### Step 1: Access RevenueCat Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Log in with your account credentials
3. Select your **Slumbr** project

### Step 2: Configure Products

#### A. Monthly Subscription ($3.99/month)

1. Navigate to **Products** → **Configure Products**
2. Find or create product: `com.slumbr.premium.monthly`
3. Set pricing:
   - **Google Play**: $3.99 USD
   - **App Store**: $3.99 USD
   - **Amazon**: $3.99 USD (if applicable)

#### B. Annual/Yearly Subscription (Optional - Currently $29.99/year recommended)

1. Find or create product: `com.slumbr.premium.annual`
2. Set pricing:
   - **Google Play**: $29.99 USD/year
   - **App Store**: $29.99 USD/year
   - (Shows ~$2.50/month equivalent in UI)

#### C. Lifetime Access ($29.99 one-time)

1. Find or create product: `com.slumbr.premium.lifetime`
2. Product Type: **One-time purchase** (not subscription)
3. Set pricing:
   - **Google Play**: $29.99 USD
   - **App Store**: $29.99 USD
   - **Amazon**: $29.99 USD (if applicable)

### Step 3: Create Offerings/Entitlements

1. Go to **Offerings** in RevenueCat
2. Create/Update offering for each:
   - **Monthly Package**: Links to monthly product
   - **Annual Package**: Links to annual product  
   - **Lifetime Package**: Links to lifetime product

3. Set entitlement to: `slumbr Pro` (matches your config)

### Step 4: Test in App

The PaywallModal will automatically display:
- **Monthly**: "$3.99" with monthly equivalent shown
- **Annual**: "$29.99" (or whatever you set) with yearly label
- **Lifetime**: "$29.99 one-time" in secondary section

---

## Current App Integration

### What's Already Configured

✅ **Paywall Modal** displays prices from RevenueCat automatically
✅ **Monthly/Annual toggle** shows savings percentage
✅ **Lifetime section** shows below with "Prefer to own it?" label
✅ **Purchase flow** handles all three options

### Code Location

- **Paywall UI**: `components/PaywallModal.tsx`
- **RevenueCat Config**: `contexts/revenuecat.tsx`
- **Entitlement ID**: `"slumbr Pro"`

---

## Pricing Display Details

### Monthly View
```
Monthly
$3.99
≈ $0.33/month (if annual converted to monthly)
```

### Annual View
```
Yearly
$29.99
≈ $2.50/month
```

### Lifetime View
```
Lifetime Access
$29.99 one-time
```

---

## Price Points Reference

### What We're Using
- Monthly: **$3.99**
- Lifetime: **$29.99**

### Why These Prices?
- **$3.99** = Attractive entry point, not too cheap to devalue
- **$29.99** = Good perceived value for lifetime access
- **7.5x ratio** = Encourages yearly/lifetime over monthly

---

## Regional Pricing (Optional)

RevenueCat supports regional pricing adjustments:
- **Europe**: €3.99/month, €29.99 lifetime
- **UK**: £3.49/month, £24.99 lifetime
- **Japan**: ¥450/month, ¥3,500 lifetime
- **Others**: Auto-converted at current rates

---

## Testing Checklist

After setting prices in RevenueCat:

- [ ] Open app and tap upgrade button
- [ ] Verify Monthly shows $3.99
- [ ] Verify Lifetime shows $29.99
- [ ] Test purchase flow (use test account)
- [ ] Confirm pricing displays correctly on web
- [ ] Check Android and iOS pricing matches

---

## Support

- RevenueCat Docs: https://docs.revenuecat.com/
- Product Setup: https://docs.revenuecat.com/docs/configuring-products
- Offerings: https://docs.revenuecat.com/docs/entitlements
