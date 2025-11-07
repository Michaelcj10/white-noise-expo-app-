/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * All colors meet WCAG AA contrast ratio standards (4.5:1 for normal text, 3:1 for large text)
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#000000", // Improved from #11181C - Better contrast on white
    background: "#fff",
    tint: tintColorLight,
    icon: "#4a5056", // Improved from #687076 - Better contrast
    tabIconDefault: "#4a5056",
    tabIconSelected: tintColorLight,
    secondaryText: "#3a3a3a", // Added for secondary text with good contrast
  },
  dark: {
    text: "#FFFFFF", // Improved from #ECEDEE - Pure white for maximum contrast
    background: "#000000", // Improved from #151718 - Pure black for maximum contrast
    tint: tintColorDark,
    icon: "#CCCCCC", // Improved from #9BA1A6 - Better contrast on dark background
    tabIconDefault: "#CCCCCC",
    tabIconSelected: tintColorDark,
    secondaryText: "#B0B0B0", // Added for secondary text with good contrast
  },
};
