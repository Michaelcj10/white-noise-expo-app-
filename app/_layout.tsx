import { CustomSplash } from "@/components/CustomSplash";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import "react-native-reanimated";
import { ThemeProvider } from "../contexts/themecontext";

import { BackgroundPlayProvider } from "@/contexts/backgroundplay";
import { QuickPlayProvider } from "@/contexts/quickplay";
import { ScrollProvider } from "@/contexts/scroll";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

export default function RootLayout() {
  const [pristine, setPristine] = useState(true);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    // Initialize app
    async function prepare() {
      try {
        // Artificially delay for consistent splash screen experience
        await new Promise((resolve) => setTimeout(resolve, 500));

        // If fonts are loaded, start transitioning
        if (loaded) {
          // Show our custom splash for a minimum duration
          await new Promise((resolve) => setTimeout(resolve, 2000));
          // Hide the native splash screen
          await SplashScreen.hideAsync();
          // Mark the app as ready to show
          setPristine(false);
        }
      } catch (error) {
        console.warn("Error preparing app:", error);
      }
    }

    prepare();
  }, [loaded]);

  if (!loaded || pristine) {
    return (
      <ThemeProvider>
        <CustomSplash />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BackgroundPlayProvider>
        <QuickPlayProvider>
          <ScrollProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </ScrollProvider>
        </QuickPlayProvider>
      </BackgroundPlayProvider>
    </ThemeProvider>
  );
}
