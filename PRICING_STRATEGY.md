# Slumbr Pro Pricing Strategy

## Overview

This document outlines the subscription pricing model implemented for Slumbr, optimized for conversion and lifetime value.

---

## Pricing Tiers

### 1. **Monthly Subscription** (Primary Entry Point)

- **Price Range**: $3.99 – $5.99 USD/month
- **Recommended**: $4.99/month
- **Position**: Left button in pricing UI
- **Best For**: Users wanting to try Pro before committing
- **Benefits**:
  - Lowest friction entry point
  - Easy to cancel anytime
  - Suitable for price-conscious users

**RevenueCat Configuration:**

```
Monthly Product ID: com.slumbr.premium.monthly
Package Type: MONTHLY
```

---

### 2. **Yearly Subscription** (Primary CTA - Anchor Here)

- **Price Range**: $19.99 – $39.99 USD/year
- **Recommended**: $29.99/year (≈ $2.50/month)
- **Position**: Right button, visually prominent
- **Pricing Psychology**: Always anchor with yearly for comparison
- **Push Hard**: This should be the default recommendation
- **Expected Savings**: 50-60% vs. monthly (calculated dynamically)

**Conversion Copy:**

- Green "Save X%" badge with savings percentage
- Shows monthly equivalent: "$2.50/month"
- Slightly larger button size
- Gold border for visual prominence

**RevenueCat Configuration:**

```
Yearly Product ID: com.slumbr.premium.annual
Package Type: ANNUAL
```

**Revenue Impact:**

- Upfront annual revenue
- Lower churn rate vs. monthly
- Higher lifetime value
- Better cash flow for development

---

### 3. **Lifetime Access** (Secondary CTA - Slightly Hidden)

- **Price Range**: $29.99 – $59.99 USD one-time
- **Recommended**: $49.99 one-time
- **Position**: Below main pricing, labeled "Prefer to own it?"
- **Why Include It**:
  - ✅ Converts subscription-averse users
  - ✅ Provides instant cash flow
  - ✅ Reduces churn complaints
  - ✅ Appeals to committed users
  - ✅ Perceived as "ownership" (psychological appeal)

**Positioning:**

```
Main Pricing (Monthly + Yearly)
    ↓
[Slightly Hidden Section]
    ↓
Lifetime Option
```

**UI Treatment:**

- Smaller font size than main options
- Outlined button style (not filled)
- Secondary color
- Optional label: "Prefer to own it?"
- No badges or special highlighting

**Price Psychology:**

- Slightly more expensive than 1 year subscription (~30% premium)
- But less than 2 years of subscription
- Appeals to power users and supporters

**RevenueCat Configuration:**

```
Lifetime Product ID: com.slumbr.premium.lifetime
Package Type: LIFETIME
```

---

## UI Implementation

### Paywall Layout (Top to Bottom)

```
┌─────────────────────────────┐
│      [Close Button]         │
├─────────────────────────────┤
│     Upgrade to Slumbr Pro   │ ← Header
│  Even free has no ads      │
├─────────────────────────────┤
│  ✓ Access 50 premium sounds │ ← Features List
│  ✓ Advanced mixing          │
│  ✓ Enhanced offline mode    │
│  ✓ Support development      │
├─────────────────────────────┤
│  ┌──────────────┬───────────┐ ← Primary CTA (Monthly + Yearly)
│  │  MONTHLY     │YEARLY     │
│  │  $4.99       │$29.99     │
│  │  /month      │SAVE 50%   │
│  │              │/year      │
│  └──────────────┴───────────┘
├─────────────────────────────┤
│  Prefer to own it?          │ ← Secondary CTA (Slightly Hidden)
│  ┌─────────────────────────┐│
│  │  Lifetime Access        ││
│  │  $49.99 one-time       ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  [Restore Purchases]        │
│  Auto-renewing subscription │
│  Cancel anytime. Terms...   │
└─────────────────────────────┘
```

### Visual Hierarchy

| Element         | Size   | Color               | Weight               |
| --------------- | ------ | ------------------- | -------------------- |
| Header          | 24px   | Theme.text          | Bold                 |
| Monthly Button  | Large  | Primary             | Filled               |
| Yearly Button   | Large  | Primary             | Filled + Gold Border |
| Savings Badge   | 11px   | Green (#10b981)     | Bold                 |
| Lifetime Label  | 13px   | Theme.textSecondary | Regular              |
| Lifetime Button | Medium | Outlined            | Regular              |

---

## Conversion Optimization

### A/B Testing Recommendations

#### Test 1: Price Points

- Control: $4.99 / $29.99 / $49.99
- Variation: $5.99 / $39.99 / $59.99
- Metric: Conversion rate, LTV

#### Test 2: Badge Copy

- Control: "Save 50%"
- Variation: "Save 60%" (adjust pricing accordingly)
- Metric: Yearly vs. monthly ratio

#### Test 3: Lifetime Visibility

- Control: Below (current implementation)
- Variation: In main pricing area
- Metric: Lifetime conversions vs. subscription conversion

#### Test 4: CTAs

- Control: "Save X%"
- Variation: "Best Value" / "Most Popular"
- Metric: Yearly subscription adoption

### Expected Metrics

**Healthy Paywall Conversion Rates:**

- Trial to paid: 5-15% (free tier users)
- Paywall views: 20-30% of free users
- Purchase conversion: 3-8% of paywall viewers

**Revenue Mix (Target):**

- Yearly subscriptions: 60-70%
- Monthly subscriptions: 20-30%
- Lifetime purchases: 5-10%

**Churn Expectations:**

- Monthly: 5-8% MoM churn
- Yearly: 0.3-0.5% MoM churn
- Lifetime: N/A (no churn)

---

## Implementation Details

### RevenueCat Configuration

Products must be created in RevenueCat console:

```
Package Type     | ID                          | Price
─────────────────────────────────────────────────
MONTHLY          | com.slumbr.premium.monthly  | $4.99
ANNUAL           | com.slumbr.premium.annual   | $29.99
LIFETIME         | com.slumbr.premium.lifetime | $49.99
```

### Code Reference

**PaywallModal.tsx:**

```typescript
// Automatically calculates savings percentage
const monthlyCost = monthlyPackage.product.price;
const yearlyCost = yearlyPackage.product.price;
const savings = ((monthlyCost * 12 - yearlyCost) / (monthlyCost * 12)) * 100;
```

**Entitlements:**

```
Entitlement ID: "slumbr Pro"
Applies to: MONTHLY, ANNUAL, LIFETIME packages
```

---

## Financial Projections

### Annual Revenue Forecast

**Assumptions:**

- 10,000 free users
- 25% paywall view rate = 2,500 views
- 5% conversion rate = 125 conversions
- 65% choose yearly, 25% monthly, 10% lifetime

**Monthly Recurring:**

- 125 conversions × 65% × $29.99 / 12 ≈ $211/month
- Plus existing monthly: 31 × $4.99 ≈ $155/month
- **Total MRR**: ~$366

**Non-Recurring:**

- 12.5 lifetime purchases/month × $49.99 ≈ $625/month
- **Total ARR from Lifetime**: ~$7,500

**Total Annual Revenue**: ~$11,000 (conservative estimate)

---

## Pricing Maintenance

### When to Adjust Prices

✅ **Increase prices when:**

- DAU grows by 50%+
- Retention improves above 20% week-1
- Paywall conversion exceeds 8%
- LTV exceeds cost of acquisition by 3x+

❌ **Do NOT increase prices if:**

- Monthly churn > 10%
- Conversion rate < 2%
- Negative reviews about pricing appear

### Regional Pricing

For future global expansion, implement auto-adjusted pricing by region:

```typescript
// Future implementation
const REGIONAL_PRICES = {
  USD: { monthly: 4.99, yearly: 29.99, lifetime: 49.99 },
  EUR: { monthly: 4.49, yearly: 26.99, lifetime: 44.99 },
  GBP: { monthly: 3.99, yearly: 23.99, lifetime: 39.99 },
  CAD: { monthly: 6.49, yearly: 38.99, lifetime: 64.99 },
};
```

---

## Customer Communication

### Email Templates

**For Monthly Subscribers:**

```
"Upgrade to Yearly and Save 50%! Switch anytime."
```

**For Lapsed Monthly Subscribers:**

```
"Try our lifetime option - own Slumbr Pro forever."
```

**For Yearly Subscribers:**

```
"Your renewal is coming. Try our lifetime option to never worry about renewal again."
```

---

## Legal & Compliance

### Subscription Disclosures

✅ **Required in paywall UI:**

- Auto-renewal terms
- Cancellation instructions
- Link to privacy policy
- Link to terms of service

✅ **Current implementation includes:**

```
"Auto-renewing subscription. Cancel anytime. Terms apply."
```

### Platform Requirements

**Apple App Store:**

- Subscription disclosures at point of purchase ✅
- Easy cancellation in Settings ✅
- Full pricing breakdown ✅

**Google Play:**

- Transparent subscription terms ✅
- Clear cancellation process ✅
- Grace period handling ✅

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
Analytics.trackPaywallViewed("source"); // Banner, Premium Sound, Settings, etc.
Analytics.trackPurchaseStarted(productId, price);
Analytics.trackPurchaseCompleted(productId, price);
Analytics.trackPurchaseFailed(productId, error);
Analytics.trackRestorePurchases(success);
```

### Dashboard KPIs

- **Paywall Views**: Daily, weekly, monthly
- **Conversion Rate**: By source and user segment
- **Revenue per User**: MRR / MAU
- **Customer Lifetime Value**: Total revenue per customer
- **Churn Rate**: % of subscribers canceling per period
- **Premium Sound Trigger**: % of paywall views from premium sounds

---

## Future Enhancements

### Seasonal Promotions

```typescript
// Implement seasonal discounts
const SEASONAL_PRICING = {
  new_year: { discount: 0.3, duration: 7 }, // 30% off first 3 months
  summer: { discount: 0.2, duration: 30 }, // 20% off for 1 month
  holiday: { discount: 0.4, duration: 14 }, // 40% off Black Friday
};
```

### Upgrade Paths

- Monthly → Yearly (mid-cycle upgrade credit)
- Yearly → Lifetime (prorated pricing)
- Lifetime → Premium Plus (future tier)

### Family Plans

```
"Family Plan" - $12.99/month (up to 4 family members)
```

---

## Conclusion

This pricing strategy balances:

- ✅ **Conversion**: Multiple price points for different segments
- ✅ **Revenue**: Yearly subscription emphasis for cash flow
- ✅ **Churn**: Lifetime option for churn reduction
- ✅ **Growth**: Psychological pricing anchors customer expectations
- ✅ **Retention**: Annual commitment improves engagement

Review quarterly and adjust based on metrics above.
