import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

// RevenueCat Configuration
const REVENUECAT_API_KEYS = {
  android: "test_eTsZgLkXYPzfShLHWZYItgPVmqu",
  ios: "test_eTsZgLkXYPzfShLHWZYItgPVmqu", // Use same key for both platforms or add iOS key
};

const REVENUECAT_CONFIG = {
  apiKey: Platform.select({
    android: REVENUECAT_API_KEYS.android,
    ios: REVENUECAT_API_KEYS.ios,
  }) as string,
  entitlementId: "slumbr Pro", // Your entitlement identifier
};

interface RevenueCatContextType {
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean }>;
  restorePurchases: () => Promise<{ success: boolean }>;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isPro: false,
  isLoading: true,
  customerInfo: null,
  offerings: null,
  purchasePackage: async () => ({ success: false }),
  restorePurchases: async () => ({ success: false }),
  showPaywall: false,
  setShowPaywall: () => {},
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

  useEffect(() => {
    const initializePurchases = async () => {
      try {
        // Enable debug logs for development (set to ERROR for production)
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // Configure Purchases with the API key
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
            setTimeout(() => reject(new Error("Timeout")), 3000)
          );
          const info = await Promise.race([infoPromise, timeoutPromise]);
          updateCustomerInfo(info as CustomerInfo);
        } catch (infoError) {
          console.warn(
            "⚠️ Could not fetch customer info (likely offline):",
            infoError
          );
          // Offline mode: default to free tier, user can restore purchases when online
          setIsPro(false);
        }

        // Get available offerings with timeout for offline scenarios
        try {
          const offeringsPromise = Purchases.getOfferings();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000)
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
              "packages"
            );
          } else {
            console.warn("⚠️ No current offering found");
          }
        } catch (offeringError) {
          console.warn(
            "⚠️ Could not fetch offerings (likely offline):",
            offeringError
          );
          // Offline mode: offerings will be null, but app continues to work
        }

        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error initializing RevenueCat:", error);
        console.log("✈️  Operating in offline/free mode");
        setIsPro(false);
        setIsLoading(false);
      }
    };

    initializePurchases();
  }, []);

  const updateCustomerInfo = (info: CustomerInfo) => {
    setCustomerInfo(info);

    // Debug: Log all active entitlements
    console.log(
      "🔍 Active entitlements:",
      Object.keys(info.entitlements.active)
    );
    console.log("🔍 Looking for entitlement:", REVENUECAT_CONFIG.entitlementId);

    // Check if user has active entitlement for "slumbr Pro"
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
    pkg: PurchasesPackage
  ): Promise<{ success: boolean }> => {
    try {
      console.log("� Attempting purchase:", pkg.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      console.log("💳 Purchase completed, updating customer info...");
      console.log(
        "🔍 Entitlements after purchase:",
        Object.keys(info.entitlements.active)
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
      Alert.alert(
        "Purchase Failed",
        error.message || "Unable to complete purchase. Please try again."
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
        Alert.alert("Success!", "Your purchases have been restored.");
        return { success: true };
      } else {
        console.log("ℹ️ No purchases to restore");
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore."
        );
        return { success: false };
      }
    } catch (error: any) {
      console.error("❌ Error restoring purchases:", error);
      Alert.alert(
        "Restore Failed",
        error.message || "Unable to restore purchases. Please try again."
      );
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
