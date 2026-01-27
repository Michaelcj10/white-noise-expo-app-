import { useTheme } from "@/contexts/themecontext";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

const darkLogo = require("../assets/images/slumbr_logo_dark.svg");
const whiteLogo = require("../assets/images/slumbr_logo_light.svg");

export const CustomSplash: React.FC = () => {
  const { themeMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Use dark theme as default to match native splash
  const isDark = themeMode === "dark" || themeMode === undefined;

  useEffect(() => {
    // Start both animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#0a0a0a", "#1a1a2e", "#16213e", "#0f3460"]
          : ["#f8f9ff", "#f0f4ff", "#e8f0ff", "#e0ecff"]
      }
      style={styles.container}
      locations={[0, 0.3, 0.65, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          style={styles.logo}
          source={isDark ? darkLogo : whiteLogo}
          contentFit="contain"
          transition={1000}
        />
      </Animated.View>
    </LinearGradient>
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
