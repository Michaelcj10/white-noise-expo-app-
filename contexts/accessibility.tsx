// contexts/accessibility.tsx
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type TextSize = "small" | "normal" | "large";

interface AccessibilityContextType {
  textSize: TextSize;
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  autoCheckUpdates: boolean;
  setTextSize: (size: TextSize) => Promise<void>;
  setHighContrastMode: (enabled: boolean) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAutoCheckUpdates: (enabled: boolean) => Promise<void>;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

const Storage = {
  async getItem(key: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
};

export const AccessibilityProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [textSize, setTextSizeState] = useState<TextSize>("normal");
  const [highContrastMode, setHighContrastModeState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [autoCheckUpdates, setAutoCheckUpdatesState] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTextSize = await Storage.getItem("accessibility_text_size");
        if (storedTextSize) {
          setTextSizeState(storedTextSize as TextSize);
        }

        const storedHighContrast = await Storage.getItem(
          "accessibility_high_contrast"
        );
        if (storedHighContrast) {
          setHighContrastModeState(storedHighContrast === "true");
        }

        const storedNotifications = await Storage.getItem(
          "notifications_enabled"
        );
        if (storedNotifications) {
          setNotificationsEnabledState(storedNotifications === "true");
        }

        const storedAutoCheck = await Storage.getItem("auto_check_updates");
        if (storedAutoCheck) {
          setAutoCheckUpdatesState(storedAutoCheck === "true");
        }
      } catch (error) {
        console.error("Error loading accessibility settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSetTextSize = async (size: TextSize) => {
    try {
      setTextSizeState(size);
      await Storage.setItem("accessibility_text_size", size);
    } catch (error) {
      console.error("Error saving text size:", error);
    }
  };

  const handleSetHighContrastMode = async (enabled: boolean) => {
    try {
      setHighContrastModeState(enabled);
      await Storage.setItem("accessibility_high_contrast", String(enabled));
    } catch (error) {
      console.error("Error saving high contrast mode:", error);
    }
  };

  const handleSetNotificationsEnabled = async (enabled: boolean) => {
    try {
      setNotificationsEnabledState(enabled);
      await Storage.setItem("notifications_enabled", String(enabled));
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  };

  const handleSetAutoCheckUpdates = async (enabled: boolean) => {
    try {
      setAutoCheckUpdatesState(enabled);
      await Storage.setItem("auto_check_updates", String(enabled));
    } catch (error) {
      console.error("Error saving auto-check updates setting:", error);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        highContrastMode,
        notificationsEnabled,
        autoCheckUpdates,
        setTextSize: handleSetTextSize,
        setHighContrastMode: handleSetHighContrastMode,
        setNotificationsEnabled: handleSetNotificationsEnabled,
        setAutoCheckUpdates: handleSetAutoCheckUpdates,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
};
