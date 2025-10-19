// contexts/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useState } from "react";

// White Noise App Color Palette
export const themes = {
  dark: {
    // Core backgrounds - pure dark theme
    background: "#0A0903",
    surface: "#221E22",
    card: "#221E22",

    // Borders and dividers - subtle contrast
    border: "#2a2a3a",
    tabBarBorder: "#2a2a3a",

    // Typography hierarchy
    text: "#ffffff",
    textSecondary: "#737373",
    textMuted: "#737373",
    sectionHeader: "#ffffff",

    // Interface elements
    tabBar: "#0d0d0d",

    // Accent colors - electric mint theme
    primary: "#59ac81ff",
    secondary: "#ec4899",
    accent: "#06b6d4",

    // Status colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",

    // Sound category colors - vibrant tones
    rain: "#3b82f6",
    ocean: "#06b6d4",
    forest: "#22c55e",
    fire: "#f97316",
    night: "#8b5cf6",
    urban: "#6b7280",

    // Controls
    switchTrackOff: "#2a2a3a",
    switchThumbOff: "#737373",
  },

  light: {
    // Core backgrounds - clean whites
    background: "#ffffff",
    surface: "#f8fafc",
    card: "#ffffff",

    // Borders and dividers
    border: "#e2e8f0",
    tabBarBorder: "#e2e8f0",

    // Typography hierarchy
    text: "#0d0d0d",
    textSecondary: "#737373",
    textMuted: "#737373",
    sectionHeader: "#0d0d0d",

    // Interface elements
    tabBar: "#ffffff",

    // Accent colors - electric mint theme
    primary: "#000",
    secondary: "#ec4899",
    accent: "#06b6d4",

    // Status colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",

    // Sound category colors - vibrant tones
    rain: "#3b82f6",
    ocean: "#06b6d4",
    forest: "#22c55e",
    fire: "#f97316",
    night: "#8b5cf6",
    urban: "#6b7280",

    // Controls
    switchTrackOff: "#e2e8f0",
    switchThumbOff: "#737373",
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
