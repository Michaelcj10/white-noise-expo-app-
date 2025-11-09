import { CustomSplash } from "@/components/CustomSplash";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { AppState } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../contexts/themecontext";

import { MIXPANEL_TOKEN } from "@/constants/analytics";
import { BackgroundPlayProvider } from "@/contexts/backgroundplay";
import { QuickPlayProvider } from "@/contexts/quickplay";
import { RevenueCatProvider } from "@/contexts/revenuecat";
import { ScrollProvider } from "@/contexts/scroll";
import { Analytics } from "@/utils/analytics";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize analytics
        console.log("🔑 Mixpanel Token:", MIXPANEL_TOKEN ? "Found" : "Missing");
        if (MIXPANEL_TOKEN) {
          await Analytics.initialize(MIXPANEL_TOKEN);
          Analytics.trackAppOpened();
        } else {
          console.warn("⚠️ Mixpanel token not found - analytics disabled");
        }

        // Wait for fonts to load
        if (loaded) {
          // Hide native splash immediately since we have custom splash
          await SplashScreen.hideAsync();

          // Show custom splash for minimum duration (smoother UX)
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Mark app as ready
          setAppReady(true);
        }
      } catch (error) {
        console.warn("Error preparing app:", error);
        // Ensure app shows even if there's an error
        setAppReady(true);
      }
    }

    prepare();
  }, [loaded]);

  // Track app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        Analytics.trackAppClosed();
        Analytics.flush();
      } else if (nextAppState === "active") {
        Analytics.trackAppOpened();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, []);

  // Show custom splash while loading fonts or during minimum splash duration
  if (!loaded || !appReady) {
    return (
      <ThemeProvider>
        <CustomSplash />
      </ThemeProvider>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: "#0A0903" }}>
      <ThemeProvider>
        <RevenueCatProvider>
          <BackgroundPlayProvider>
            <QuickPlayProvider>
              <ScrollProvider>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: "#0A0903" },
                  }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </ScrollProvider>
            </QuickPlayProvider>
          </BackgroundPlayProvider>
        </RevenueCatProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
