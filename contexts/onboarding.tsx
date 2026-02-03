import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

interface OnboardingContextType {
  hasCompletedOnboarding: boolean | null;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
  isLoadingOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

// Storage helper
const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== "undefined") {
        // Web platform
        const value = window.localStorage.getItem(key);
        return value || null;
      }
      // Native platform - try AsyncStorage first
      if (AsyncStorage?.getItem) {
        try {
          return await AsyncStorage.getItem(key);
        } catch (asyncStorageError) {
          console.warn(
            `AsyncStorage getItem failed for ${key}:`,
            asyncStorageError,
          );
          // Fallback to SecureStore
          if (SecureStore?.getItemAsync) {
            try {
              return await SecureStore.getItemAsync(key);
            } catch (secureStoreError) {
              console.warn(
                `SecureStore getItem also failed for ${key}:`,
                secureStoreError,
              );
              return null;
            }
          }
          return null;
        }
      } else if (SecureStore?.getItemAsync) {
        // AsyncStorage not available, try SecureStore directly
        try {
          return await SecureStore.getItemAsync(key);
        } catch (secureStoreError) {
          console.warn(
            `SecureStore getItem failed for ${key}:`,
            secureStoreError,
          );
          return null;
        }
      }
      return null;
    } catch (error) {
      console.warn(`Error reading ${key}:`, error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== "undefined") {
        // Web platform
        window.localStorage.setItem(key, value);
        return;
      }
      // Native platform - try AsyncStorage first
      if (AsyncStorage?.setItem) {
        try {
          await AsyncStorage.setItem(key, value);
          return;
        } catch (asyncStorageError) {
          console.warn(
            `AsyncStorage setItem failed for ${key}:`,
            asyncStorageError,
          );
          // Fallback to SecureStore
          if (SecureStore?.setItemAsync) {
            try {
              await SecureStore.setItemAsync(key, value);
              return;
            } catch (secureStoreError) {
              console.warn(
                `SecureStore setItem also failed for ${key}:`,
                secureStoreError,
              );
              // Silently fail - storage not critical for functionality
            }
          }
        }
      } else if (SecureStore?.setItemAsync) {
        // AsyncStorage not available, try SecureStore directly
        try {
          await SecureStore.setItemAsync(key, value);
          return;
        } catch (secureStoreError) {
          console.warn(
            `SecureStore setItem failed for ${key}:`,
            secureStoreError,
          );
          // Silently fail - storage not critical for functionality
        }
      }
    } catch (error) {
      console.warn(`Error writing ${key}:`, error);
      // Silently fail - storage not critical for functionality
    }
  },
};

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | null
  >(true); // Start as true (hidden) by default
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  // Load onboarding status on mount
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        console.log("📋 Loading onboarding status...");
        const hasSeenOnboarding = await Storage.getItem("has_seen_onboarding");
        console.log("📋 Storage check result:", hasSeenOnboarding);
        setHasCompletedOnboarding(hasSeenOnboarding === "true");
      } catch (error) {
        console.warn("Error loading onboarding status:", error);
        // Default to showing onboarding if there's an error
        setHasCompletedOnboarding(false);
      } finally {
        console.log("📋 Onboarding loading complete");
        setIsLoadingOnboarding(false);
      }
    };

    loadOnboardingStatus();
  }, []);

  const handleSetHasCompletedOnboarding = async (value: boolean) => {
    try {
      // Save to storage
      if (typeof window !== "undefined") {
        // Web platform
        window.localStorage.setItem(
          "has_seen_onboarding",
          value ? "true" : "false",
        );
      } else {
        // Native platform
        if (AsyncStorage?.setItem) {
          await AsyncStorage.setItem(
            "has_seen_onboarding",
            value ? "true" : "false",
          );
        }
      }
    } catch (error) {
      console.warn("Error saving onboarding status:", error);
    }
    // Always update state even if storage fails
    setHasCompletedOnboarding(value);
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        setHasCompletedOnboarding: handleSetHasCompletedOnboarding,
        isLoadingOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
