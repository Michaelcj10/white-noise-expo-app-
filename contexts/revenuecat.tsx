import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

// RevenueCat Configuration
// Project ID: projb5fc2109 (for dashboard reference)
const REVENUECAT_API_KEYS = {
  android: "test_RkRHTuKBoKajkGhzyZOvMnKaBkC",
  ios: "test_RkRHTuKBoKajkGhzyZOvMnKaBkC", // Use same key for both platforms or add iOS key
};

const REVENUECAT_CONFIG = {
  apiKey: Platform.select({
    android: REVENUECAT_API_KEYS.android,
    ios: REVENUECAT_API_KEYS.ios,
  }) as string,
  entitlementId: "drowse Pro", // Your entitlement identifier
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
      // Skip RevenueCat initialization on web - SDK not supported on web
      if (Platform.OS === "web") {
        console.log(
          "🌐 Web platform detected - RevenueCat SDK not available on web",
        );
        console.log(
          "✈️  Operating in offline/free mode (web doesn't support native billing)",
        );
        setIsPro(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log(
          `🚀 Starting RevenueCat initialization... (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`,
        );
        console.log("📱 Platform:", Platform.OS);
        console.log(
          "🔑 API Key:",
          REVENUECAT_CONFIG.apiKey ? "✓ Present" : "✗ Missing",
        );

        // Enable debug logs for development (set to ERROR for production)
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        console.log("📝 Debug logging enabled");

        // Configure Purchases with the API key
        console.log("⚙️ Configuring Purchases with API key...");
        await Purchases.configure({
          apiKey: REVENUECAT_CONFIG.apiKey,
        });

        console.log("✅ RevenueCat SDK initialized successfully");

        // Set up listener for purchase updates
        Purchases.addCustomerInfoUpdateListener((info) => {
          console.log("📱 Customer info updated");
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
          console.warn(
            "⚠️ Could not fetch customer info (likely offline):",
            infoError,
          );
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
            console.log(
              "📦 Loaded offerings:",
              off.current.availablePackages.length,
              "packages",
            );
          } else {
            console.warn("⚠️ No current offering found");
          }
        } catch (offeringError) {
          console.warn(
            "⚠️ Could not fetch offerings (likely offline):",
            offeringError,
          );
          // Offline mode: offerings will be null, but app continues to work
        }

        setIsLoading(false);
      } catch (error: any) {
        console.error("❌ Error initializing RevenueCat");
        console.error("   Error type:", error?.name || typeof error);
        console.error("   Error message:", error?.message || error);
        console.error("   Full error:", error);

        // Retry logic for API key errors
        if (
          retryCount < MAX_RETRIES &&
          (error?.message?.includes("Invalid API key") ||
            error?.message?.includes("401") ||
            error?.message?.includes("Unauthorized"))
        ) {
          console.log(
            `⏳ Retrying initialization in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`,
          );
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 2000);
          return;
        }

        console.log("✈️  Operating in offline/free mode");
        setIsPro(false);
        setIsLoading(false);
      }
    };

    initializePurchases();
  }, [retryCount]);

  const updateCustomerInfo = (info: CustomerInfo) => {
    setCustomerInfo(info);

    // Debug: Log all active entitlements
    console.log(
      "🔍 Active entitlements:",
      Object.keys(info.entitlements.active),
    );
    console.log("🔍 Looking for entitlement:", REVENUECAT_CONFIG.entitlementId);

    // Check if user has active entitlement for "Drowse Pro"
    const hasProAccess =
      info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;

    console.log("🔍 hasProAccess result:", hasProAccess);
    console.log("🔍 Setting isPro to:", hasProAccess);

    setIsPro(hasProAccess);

    if (hasProAccess) {
      const entitlement =
        info.entitlements.active[REVENUECAT_CONFIG.entitlementId];
      console.log("✨ Pro access granted:", {
        productIdentifier: entitlement.productIdentifier,
        expirationDate: entitlement.expirationDate,
        willRenew: entitlement.willRenew,
      });
    } else {
      console.log("🔒 No pro access");
    }
  };

  const purchasePackage = async (
    pkg: PurchasesPackage,
  ): Promise<{ success: boolean }> => {
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
        return { success: false };
      }
      console.error("❌ Error purchasing package:", error);
      showToast(
        error.message || "Unable to complete purchase. Please try again.",
        "error",
      );
      return { success: false };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean }> => {
    try {
      console.log("🔄 Restoring purchases...");
      const info = await Purchases.restorePurchases();
      updateCustomerInfo(info);

      const hasActiveEntitlement =
        info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;

      if (hasActiveEntitlement) {
        console.log("✅ Purchases restored successfully");
        return { success: true };
      } else {
        console.log("ℹ️ No purchases to restore");
        return { success: false };
      }
    } catch (error: any) {
      console.error("❌ Error restoring purchases:", error);
      return { success: false };
    }
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
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
};
