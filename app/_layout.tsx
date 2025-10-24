import { CustomSplash } from "@/components/CustomSplash";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import "react-native-reanimated";
import { ThemeProvider } from "../contexts/themecontext";

import { BackgroundPlayProvider } from "@/contexts/backgroundplay";
import { QuickPlayProvider } from "@/contexts/quickplay";
import { ScrollProvider } from "@/contexts/scroll";

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        if (loaded) {
          // Keep splash screen visible while we fetch resources
          await SplashScreen.preventAutoHideAsync();
          // Hide after a delay to show our custom splash
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.warn("Error preparing app:", error);
      }
    }
    prepare();
  }, [loaded]);

  if (loaded) {
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
