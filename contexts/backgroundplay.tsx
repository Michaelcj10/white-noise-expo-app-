// contexts/BackgroundPlayContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface BackgroundPlayContextType {
  backgroundPlayEnabled: boolean;
  setBackgroundPlayEnabled: (enabled: boolean) => void;
  toggleBackgroundPlay: () => void;
}

const BackgroundPlayContext = createContext<
  BackgroundPlayContextType | undefined
>(undefined);

export const useBackgroundPlay = () => {
  const context = useContext(BackgroundPlayContext);
  if (!context) {
    throw new Error(
      "useBackgroundPlay must be used within a BackgroundPlayProvider"
    );
  }
  return context;
};

export const BackgroundPlayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [backgroundPlayEnabled, setBackgroundPlayEnabledState] = useState(true);

  useEffect(() => {
    loadBackgroundPlaySetting();
  }, []);

  const loadBackgroundPlaySetting = async () => {
    try {
      const setting = await AsyncStorage.getItem("backgroundPlayEnabled");
      if (setting !== null) {
        const parsed = JSON.parse(setting);
        // Validate that parsed data is a boolean
        if (typeof parsed === "boolean") {
          setBackgroundPlayEnabledState(parsed);
        } else {
          console.error("Invalid background play setting format");
        }
      }
    } catch (error) {
      console.error("Error loading background play setting:", error);
      // Keep default value (true) on error
    }
  };

  const setBackgroundPlayEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(
        "backgroundPlayEnabled",
        JSON.stringify(enabled)
      );
      setBackgroundPlayEnabledState(enabled);
    } catch (error) {
      console.error("Error saving background play setting:", error);
    }
  };

  const toggleBackgroundPlay = () => {
    setBackgroundPlayEnabled(!backgroundPlayEnabled);
  };

  return (
    <BackgroundPlayContext.Provider
      value={{
        backgroundPlayEnabled,
        setBackgroundPlayEnabled,
        toggleBackgroundPlay,
      }}
    >
      {children}
    </BackgroundPlayContext.Provider>
  );
};
