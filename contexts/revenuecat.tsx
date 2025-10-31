import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

// RevenueCat API Keys - REPLACE WITH YOUR ACTUAL KEYS
const REVENUECAT_API_KEY = Platform.select({
  ios: "appl_YOUR_IOS_KEY", // Replace with your iOS key from RevenueCat
  android: "goog_YOUR_ANDROID_KEY", // Replace with your Android key from RevenueCat
});

interface RevenueCatContextType {
  isPro: boolean;
  isLoading: boolean;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isPro: false,
  isLoading: true,
  offerings: null,
  purchasePackage: async () => {},
  restorePurchases: async () => {},
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export const RevenueCatProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      if (!REVENUECAT_API_KEY) {
        console.warn("RevenueCat API key not configured");
        setIsLoading(false);
        return;
      }

      // Configure Purchases
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });

      // Set up listener for purchase updates
      Purchases.addCustomerInfoUpdateListener((info) => {
        updateCustomerInfo(info);
      });

      // Get initial customer info
      const customerInfo = await Purchases.getCustomerInfo();
      updateCustomerInfo(customerInfo);

      // Get available offerings
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setOfferings(offerings.current);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing purchases:", error);
      setIsLoading(false);
    }
  };

  const updateCustomerInfo = (customerInfo: CustomerInfo) => {
    // Check if user has active "pro" entitlement
    const hasProAccess = customerInfo.entitlements.active["pro"] !== undefined;
    setIsPro(hasProAccess);
  };

  const purchasePackage = async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updateCustomerInfo(customerInfo);
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Error purchasing package:", error);
        throw error;
      }
    }
  };

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      updateCustomerInfo(customerInfo);
    } catch (error) {
      console.error("Error restoring purchases:", error);
      throw error;
    }
  };

  return (
    <RevenueCatContext.Provider
      value={{
        isPro,
        isLoading,
        offerings,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
};
