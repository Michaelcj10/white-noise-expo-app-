import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

import Constants from "expo-constants";
// RevenueCat Configuration
// Project ID: projb5fc2109 (for dashboard reference)
// Android production keys start with "goog_", iOS with "appl_"
const REVENUECAT_CONFIG = {
  apiKey:
    Platform.select({
      android: Constants.expoConfig?.extra?.revenueCatGoogleApiKey,
      ios: Constants.expoConfig?.extra?.revenueCatIosApiKey,
      default: "",
    }) || "",
  entitlementIds: ["drowse Pro", "lifetime", "monthly", "yearly"],
};

// Helper to check if API key is valid
const isValidApiKey = (key: string): boolean => {
  if (!key || key.length === 0) return false;
  if (key.includes("YOUR_PRODUCTION_KEY")) return false;
  // Production keys must start with goog_ (Android) or appl_ (iOS)
  return key.startsWith("goog_") || key.startsWith("appl_");
};

// Product identifiers for your offerings (from RevenueCat dashboard)
export const PRODUCT_IDENTIFIERS = {
  monthly: "monthly",
  lifetime: "lifetime",
  // yearly: "yearly", // Add this if you create a yearly product
};

interface RevenueCatContextType {
  // Subscription state
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;

  // Purchase methods
  purchasePackage: (
    pkg: PurchasesPackage,
  ) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{
    success: boolean;
    restoredPurchases: boolean;
  }>;

  // Custom paywall state (for fallback)
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;

  // RevenueCat Native Paywall
  presentPaywall: () => Promise<{ purchased: boolean; restored: boolean }>;
  presentPaywallIfNeeded: () => Promise<{
    purchased: boolean;
    restored: boolean;
  }>;

  // Customer Center
  presentCustomerCenter: () => Promise<void>;

  // Subscription info helpers
  getActiveSubscriptionInfo: () => {
    productId: string | null;
    expirationDate: string | null;
    willRenew: boolean;
    periodType: string | null;
  } | null;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isPro: false,
  isLoading: true,
  customerInfo: null,
  offerings: null,
  purchasePackage: async () => ({ success: false }),
  restorePurchases: async () => ({ success: false, restoredPurchases: false }),
  showPaywall: false,
  setShowPaywall: () => {},
  presentPaywall: async () => ({ purchased: false, restored: false }),
  presentPaywallIfNeeded: async () => ({ purchased: false, restored: false }),
  presentCustomerCenter: async () => {},
  getActiveSubscriptionInfo: () => null,
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export const RevenueCatProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const initializePurchases = async () => {
      try {
        // Skip RevenueCat initialization on web - SDK not supported on web
        if (Platform.OS === "web") {
          setIsPro(false);
          setIsLoading(false);
          return;
        }

        // Check if API key is valid before attempting initialization
        // Empty string or placeholder = skip initialization, run in free mode
        const apiKey = REVENUECAT_CONFIG.apiKey;
        if (
          !apiKey ||
          apiKey.length < 10 ||
          (!apiKey.startsWith("goog_") && !apiKey.startsWith("appl_"))
        ) {
          // No valid production key - run in free mode (no crash)
          setIsPro(false);
          setIsLoading(false);
          return;
        }

        // Configure Purchases with the API key first
        await Purchases.configure({
          apiKey: apiKey,
        });

        // Enable debug logs AFTER configure (set to ERROR for production)
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // Set up listener for purchase updates
        Purchases.addCustomerInfoUpdateListener((info) => {
          updateCustomerInfo(info);
        });

        // Get initial customer info with timeout for offline scenarios
        try {
          const infoPromise = Purchases.getCustomerInfo();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000),
          );
          const info = await Promise.race([infoPromise, timeoutPromise]);
          updateCustomerInfo(info as CustomerInfo);
        } catch (infoError) {
          // Offline mode: default to free tier, user can restore purchases when online
          setIsPro(false);
        }

        // Get available offerings with timeout for offline scenarios
        try {
          const offeringsPromise = Purchases.getOfferings();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000),
          );
          const fetchedOfferings = await Promise.race([
            offeringsPromise,
            timeoutPromise,
          ]);
          const off = fetchedOfferings as any;
          if (off.current) {
            setOfferings(off.current);
          }
        } catch (offeringError) {
          // Offline mode: offerings will be null, but app continues to work
        }

        setIsLoading(false);
      } catch (error: any) {
        // Retry logic for API key errors
        if (
          retryCount < MAX_RETRIES &&
          (error?.message?.includes("Invalid API key") ||
            error?.message?.includes("401") ||
            error?.message?.includes("Unauthorized"))
        ) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 2000);
          return;
        }

        // Any error: fall back to free mode - NEVER leave isLoading=true
        setIsPro(false);
        setIsLoading(false);
      }
    };

    initializePurchases();
  }, [retryCount]);

  const updateCustomerInfo = (info: CustomerInfo) => {
    setCustomerInfo(info);

    // Debug: Log all active entitlements
    const activeEntitlements = Object.keys(info.entitlements.active);
    console.log("🔍 Active entitlements:", activeEntitlements);
    console.log(
      "🔍 Looking for entitlements:",
      REVENUECAT_CONFIG.entitlementIds,
    );

    // Check if user has any of the pro entitlements (lifetime, monthly, yearly)
    const hasProAccess = REVENUECAT_CONFIG.entitlementIds.some(
      (entitlementId) =>
        info.entitlements.active[entitlementId]?.isActive === true,
    );

    console.log("🔍 hasProAccess result:", hasProAccess);
    console.log("🔍 Setting isPro to:", hasProAccess);

    // Force state update by using callback form
    setIsPro((prev) => {
      if (prev !== hasProAccess) {
        console.log("📱 isPro state changing from", prev, "to", hasProAccess);
      }
      return hasProAccess;
    });

    if (hasProAccess) {
      // Find which entitlement is active
      const activeEntitlementId = REVENUECAT_CONFIG.entitlementIds.find(
        (id) => info.entitlements.active[id]?.isActive === true,
      );
      const entitlement = activeEntitlementId
        ? info.entitlements.active[activeEntitlementId]
        : null;
      if (entitlement) {
        console.log("✨ Pro access granted:", {
          entitlement: activeEntitlementId,
          productIdentifier: entitlement.productIdentifier,
          expirationDate: entitlement.expirationDate,
          willRenew: entitlement.willRenew,
        });
      }
    } else {
      console.log("🔒 No pro access");
    }
  };

  const purchasePackage = async (
    pkg: PurchasesPackage,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("� Attempting purchase:", pkg.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      console.log("💳 Purchase completed, updating customer info...");
      console.log(
        "🔍 Entitlements after purchase:",
        Object.keys(info.entitlements.active),
      );
      updateCustomerInfo(info);
      console.log("✅ Purchase successful");
      return { success: true };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log("❌ User cancelled purchase");
        return { success: false, error: "cancelled" };
      }
      console.error("❌ Error purchasing package:", error);
      return {
        success: false,
        error:
          error.message || "Unable to complete purchase. Please try again.",
      };
    }
  };

  const restorePurchases = async (): Promise<{
    success: boolean;
    restoredPurchases: boolean;
  }> => {
    try {
      console.log("🔄 Restoring purchases...");
      const info = await Purchases.restorePurchases();
      updateCustomerInfo(info);

      // Check if any of the pro entitlements are active
      const hasActiveEntitlement = REVENUECAT_CONFIG.entitlementIds.some(
        (entitlementId) =>
          info.entitlements.active[entitlementId]?.isActive === true,
      );

      if (hasActiveEntitlement) {
        console.log("✅ Purchases restored successfully");
        return { success: true, restoredPurchases: true };
      } else {
        console.log("ℹ️ No purchases to restore");
        return { success: false, restoredPurchases: false };
      }
    } catch (error: any) {
      console.error("❌ Error restoring purchases:", error);
      return { success: false, restoredPurchases: false };
    }
  };

  // Stub implementations for missing context methods
  const presentPaywall = async (): Promise<{
    purchased: boolean;
    restored: boolean;
  }> => {
    setShowPaywall(true);
    return { purchased: false, restored: false };
  };

  const presentPaywallIfNeeded = async (): Promise<{
    purchased: boolean;
    restored: boolean;
  }> => {
    if (!isPro) {
      setShowPaywall(true);
      return { purchased: false, restored: false };
    }
    return { purchased: false, restored: false };
  };

  const presentCustomerCenter = async (): Promise<void> => {
    // Implement navigation to customer center if available
    // For now, just log
    console.log("presentCustomerCenter called");
  };

  const getActiveSubscriptionInfo = () => {
    if (!customerInfo) return null;
    const activeEntitlementId = REVENUECAT_CONFIG.entitlementIds.find(
      (id) => customerInfo.entitlements.active[id]?.isActive === true,
    );
    if (!activeEntitlementId) return null;
    const entitlement = customerInfo.entitlements.active[activeEntitlementId];
    return {
      productId: entitlement.productIdentifier ?? null,
      expirationDate: entitlement.expirationDate ?? null,
      willRenew: entitlement.willRenew ?? false,
      periodType: entitlement.periodType ?? null,
    };
  };

  return (
    <RevenueCatContext.Provider
      value={{
        isPro,
        isLoading,
        customerInfo,
        offerings,
        purchasePackage,
        restorePurchases,
        showPaywall,
        setShowPaywall,
        presentPaywall,
        presentPaywallIfNeeded,
        presentCustomerCenter,
        getActiveSubscriptionInfo,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
};
