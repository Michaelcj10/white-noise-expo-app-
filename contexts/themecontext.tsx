// contexts/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useState } from "react";

// White Noise App Color Palette
export const themes = {
  dark: {
    // Core backgrounds - deep, calming blues
    background: "rgb(8, 15, 26)",
    surface: "rgb(15, 23, 35)",
    card: "rgb(20, 30, 45)",

    // Borders and dividers - subtle contrast
    border: "rgb(30, 41, 59)",
    tabBarBorder: "rgb(25, 35, 50)",

    // Typography hierarchy
    text: "rgb(248, 250, 252)",
    textSecondary: "rgb(148, 163, 184)",
    textMuted: "rgb(100, 116, 139)",
    sectionHeader: "rgb(203, 213, 225)",

    // Interface elements
    tabBar: "rgb(12, 20, 32)",

    // Accent colors - soothing and functional
    primary: "rgb(59, 130, 246)", // Calming blue
    secondary: "rgb(99, 102, 241)", // Soft indigo
    accent: "rgb(16, 185, 129)", // Gentle teal

    // Status colors
    success: "rgb(34, 197, 94)",
    warning: "rgb(251, 191, 36)",
    error: "rgb(239, 68, 68)",

    // Sound category colors - nature inspired
    rain: "rgb(59, 130, 246)", // Rain blue
    ocean: "rgb(6, 182, 212)", // Ocean cyan
    forest: "rgb(34, 197, 94)", // Forest green
    fire: "rgb(251, 146, 60)", // Fire orange
    night: "rgb(139, 92, 246)", // Night purple
    urban: "rgb(156, 163, 175)", // Urban gray

    // Controls
    switchTrackOff: "rgb(30, 41, 59)",
    switchThumbOff: "rgb(71, 85, 105)",
  },

  light: {
    // Core backgrounds - soft, clean whites
    background: "rgb(250, 251, 252)",
    surface: "rgb(248, 250, 252)",
    card: "rgb(255, 255, 255)",

    // Borders and dividers
    border: "rgb(226, 232, 240)",
    tabBarBorder: "rgb(241, 245, 249)",

    // Typography hierarchy
    text: "rgb(15, 23, 42)",
    textSecondary: "rgb(71, 85, 105)",
    textMuted: "rgb(100, 116, 139)",
    sectionHeader: "rgb(30, 41, 59)",

    // Interface elements
    tabBar: "rgb(255, 255, 255)",

    // Accent colors - vibrant but not harsh
    primary: "rgb(37, 99, 235)", // Vibrant blue
    secondary: "rgb(67, 56, 202)", // Rich indigo
    accent: "rgb(5, 150, 105)", // Fresh teal

    // Status colors
    success: "rgb(22, 163, 74)",
    warning: "rgb(217, 119, 6)",
    error: "rgb(220, 38, 38)",

    // Sound category colors - vibrant nature tones
    rain: "rgb(37, 99, 235)", // Rain blue
    ocean: "rgb(8, 145, 178)", // Ocean blue
    forest: "rgb(22, 163, 74)", // Forest green
    fire: "rgb(234, 88, 12)", // Fire orange
    night: "rgb(124, 58, 237)", // Night purple
    urban: "rgb(75, 85, 99)", // Urban gray

    // Controls
    switchTrackOff: "rgb(226, 232, 240)",
    switchThumbOff: "rgb(148, 163, 184)",
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
