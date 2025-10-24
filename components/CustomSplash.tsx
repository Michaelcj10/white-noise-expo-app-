import { useTheme } from "@/contexts/themecontext";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

const darkLogo = require("../assets/images/slumbr_logo_dark.svg");
const whiteLogo = require("../assets/images/slumbr_logo_light.svg");

interface SplashScreenProps {}

export const CustomSplash: React.FC<SplashScreenProps> = () => {
  const { theme, themeMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.logo}
          source={themeMode === "dark" ? darkLogo : whiteLogo}
          contentFit="contain"
          transition={1000}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    flex: 1,
    flexGrow: 1,
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 75,
  },
});
