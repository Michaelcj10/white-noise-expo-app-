// contexts/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useState } from "react";

// White Noise App Color Palette
export const themes = {
  dark: {
    // Core backgrounds - pure dark theme
    background: "#0A0903",
    surface: "#141214",
    card: "#141214",

    // Borders and dividers - subtle contrast
    border: "#2a2a3a",
    tabBarBorder: "#2a2a3a",

    // Typography hierarchy
    text: "#ffffff",
    textSecondary: "#c4c0c0",
    textMuted: "#d6d6d6",
    sectionHeader: "#ffffff",

    // Interface elementsre
    tabBar: "#0d0d0d",

    // Accent colors - electric mint theme
    primary: "#009966",
    secondary: "#ec4899",
    accent: "#06b6d4",

    // Status colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",

    // Sound category colors - muted, desaturated
    rain: "#5b8dd4",
    ocean: "#4fa3a8",
    forest: "#5aaa5a",
    fire: "#d48f4f",
    night: "#8b5fa3",
    urban: "#888888",

    // Controls
    switchTrackOff: "#2a2a3a",
    switchThumbOff: "#737373",
  },

  light: {
    // Core backgrounds - warm cream tones
    background: "#FAF9F6", // slightly lighter, warmer
    surface: "#FFFFFF", // cards pop slightly
    card: "#FFFFFF",

    // Borders - subtle warmth
    border: "#E8E4DF",
    tabBarBorder: "#EBE7E2",

    // Typography - warm charcoal, not harsh black
    text: "#3D3833",
    textSecondary: "#7A756E",
    textMuted: "#A9A49D",
    sectionHeader: "#5C564F",

    // Interface
    tabBar: "#FFFFFF",
    tabBarInactive: "#A9A49D",
    tabBarActive: "#5B8A72",

    // Accent - muted sage green (calming, on-brand)
    primary: "#5B8A72",
    primaryMuted: "#7BA393",
    secondary: "#B8A398", // warm taupe
    accent: "#7BA3A0", // soft teal

    // Status - desaturated
    success: "#7BA383",
    warning: "#C9A86C",
    error: "#C48B8B",

    // Sound categories - soft, muted pastels
    rain: "#8E9BAA", // slate blue
    ocean: "#89A3A7", // dusty teal
    forest: "#8B9E87", // sage
    fire: "#B8A089", // warm sand
    night: "#9B93A8", // lavender grey
    urban: "#94908B", // warm grey

    // Controls
    switchTrackOff: "#E5E1DC",
    switchTrackOn: "#5B8A72",
    switchThumbOff: "#FFFFFF",
    switchThumbOn: "#FFFFFF",

    // Cards - subtle depth
    cardShadow: "rgba(60, 55, 50, 0.06)",

    // Pro banner - subtle gradient suggestion
    proBannerBg: "#6B5B7A", // muted purple
  },
};

export type Theme = typeof themes.dark;
export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on app start
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setThemeMode(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem("theme", mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(newMode);
    saveTheme(newMode);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveTheme(mode);
  };

  const theme = themes[themeMode];

  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setTheme }}>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
};
