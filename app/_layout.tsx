import { CustomSplash } from "@/components/CustomSplash";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../contexts/themecontext";

import { BackgroundPlayProvider } from "@/contexts/backgroundplay";
import { QuickPlayProvider } from "@/contexts/quickplay";
import { RevenueCatProvider } from "@/contexts/revenuecat";
import { ScrollProvider } from "@/contexts/scroll";

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
        // Wait for fonts to load
        if (loaded) {
          // Hide native splash immediately since we have custom splash
          await SplashScreen.hideAsync();

          // Show custom splash for minimum duration (better UX)
          await new Promise((resolve) => setTimeout(resolve, 2000));

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

  // Show custom splash while loading fonts or during minimum splash duration
  if (!loaded || !appReady) {
    return (
      <ThemeProvider>
        <CustomSplash />
      </ThemeProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RevenueCatProvider>
          <BackgroundPlayProvider>
            <QuickPlayProvider>
              <ScrollProvider>
                <Stack>
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
