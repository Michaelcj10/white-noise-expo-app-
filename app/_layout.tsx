import { CustomSplash } from "@/components/CustomSplash";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  AppState,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AccessibilityProvider } from "../contexts/accessibility";
import { OnboardingProvider, useOnboarding } from "../contexts/onboarding";
import { ThemeProvider, useTheme } from "../contexts/themecontext";

import { MIXPANEL_TOKEN } from "@/constants/analytics";
import { BackgroundPlayProvider } from "@/contexts/backgroundplay";
import { NotificationProvider } from "@/contexts/notification";
import { QuickPlayProvider } from "@/contexts/quickplay";
import { RevenueCatProvider } from "@/contexts/revenuecat";
import { ScrollProvider } from "@/contexts/scroll";
import { ToastProvider } from "@/contexts/toast";
import { Analytics } from "@/utils/analytics";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Move static data outside component to prevent recreation on every render
const ONBOARDING_SCREENS = [
  {
    title: "Curated Sounds",
    subtitle: "50+ white noise, nature, and ambient sounds",
    description: "Hand-picked audio to help you relax, sleep, or concentrate",
    icon: "musical-notes" as const,
    iconColor: "#3b82f6",
    feature: "Browse our full library from the Sounds tab",
  },
  {
    title: "Quick Play",
    subtitle: "One-tap access to your favorite",
    description: "Save any sound as your favorite and play it instantly",
    icon: "heart" as const,
    iconColor: "#ec4899",
    feature: "Tap the center button to start playing",
  },
  {
    title: "Mix & Match",
    subtitle: "Layer multiple sounds together",
    description:
      "Combine sounds with individual volume controls for your perfect soundscape",
    icon: "layers" as const,
    iconColor: "#06b6d4",
    feature: "Use the mixer to create your blend",
  },
] as const;

// Memoized Onboarding Modal Component
const OnboardingModal = React.memo(function OnboardingModal() {
  const { theme, themeMode } = useTheme();
  const {
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    isLoadingOnboarding,
  } = useOnboarding();
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Animated values for transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Memoize current screen to prevent object recreation
  const currentScreen = ONBOARDING_SCREENS[onboardingStep];

  // Memoize gradient colors
  const gradientColors = useMemo(
    () =>
      themeMode === "dark"
        ? (["#0a0a0a", "#1a1a2e", "#16213e", "#0f3460"] as const)
        : (["#f8f9ff", "#f0f4ff", "#e8f0ff", "#e0ecff"] as const),
    [themeMode],
  );

  // Animate when step changes
  useEffect(() => {
    if (onboardingStep === 0) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [onboardingStep, fadeAnim, slideAnim]);

  // Memoize callbacks
  const completeOnboarding = useCallback(async () => {
    await setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  const goBack = useCallback(() => {
    setOnboardingStep((prev) => prev - 1);
  }, []);

  const goNext = useCallback(() => {
    if (onboardingStep < ONBOARDING_SCREENS.length - 1) {
      setOnboardingStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  }, [onboardingStep, completeOnboarding]);

  // Only show if loading is done and flag is false
  if (isLoadingOnboarding || hasCompletedOnboarding !== false) {
    return null;
  }

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        <LinearGradient
          colors={gradientColors}
          style={{ flex: 1 }}
          locations={[0, 0.3, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
            {/* Skip Button */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                paddingTop: 8,
              }}
            >
              <View style={{ width: 40 }} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.text,
                }}
              >
                {onboardingStep + 1} / {ONBOARDING_SCREENS.length}
              </Text>
              <TouchableOpacity
                onPress={completeOnboarding}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Skip
                </Text>
                <Ionicons name="arrow-forward" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* Progress Dots */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                marginBottom: 30,
              }}
            >
              {ONBOARDING_SCREENS.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: onboardingStep === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      onboardingStep === index
                        ? currentScreen.iconColor
                        : theme.border,
                  }}
                />
              ))}
            </View>

            {/* Screen Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Animated.View
                style={{
                  width: "100%",
                  alignItems: "center",
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Large Icon */}
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: currentScreen.iconColor,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 40,
                    shadowColor: currentScreen.iconColor,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <Ionicons name={currentScreen.icon} size={56} color="white" />
                </View>

                {/* Text Content */}
                <View
                  style={{
                    alignItems: "center",
                    marginBottom: 40,
                    width: "100%",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "800",
                      color: theme.text,
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    {currentScreen.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: currentScreen.iconColor,
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    {currentScreen.subtitle}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.textSecondary,
                      textAlign: "center",
                      lineHeight: 24,
                      marginBottom: 20,
                    }}
                  >
                    {currentScreen.description}
                  </Text>

                  {/* Feature hint */}
                  <View
                    style={{
                      backgroundColor: currentScreen.iconColor + "15",
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.text,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      💡 {currentScreen.feature}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </ScrollView>

            {/* Navigation Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {onboardingStep > 0 && (
                <TouchableOpacity
                  onPress={goBack}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 24,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    borderColor: "white",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color="white" />
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={goNext}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  backgroundColor: theme.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {onboardingStep === ONBOARDING_SCREENS.length - 1
                    ? "Get Started"
                    : "Next"}
                </Text>
                <Ionicons
                  name={
                    onboardingStep === ONBOARDING_SCREENS.length - 1
                      ? "play"
                      : "arrow-forward"
                  }
                  size={18}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
});

function RootLayoutContent() {
  const [appReady, setAppReady] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { isLoadingOnboarding } = useOnboarding();

  // Track if initialization has been done to prevent double execution
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initRef.current) return;

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

        // Wait for fonts to load and onboarding status to be determined
        if (loaded && !isLoadingOnboarding) {
          initRef.current = true;

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
  }, [loaded, isLoadingOnboarding]);

  // Track app state changes - separate effect with stable reference
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
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  // Show custom splash while loading fonts, during minimum splash duration, or waiting for onboarding status
  if (!loaded || !appReady || isLoadingOnboarding) {
    return (
      <ThemeProvider>
        <CustomSplash />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationProvider>
          <AccessibilityProvider>
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

                    {/* Onboarding Modal - inside providers */}
                    <OnboardingModal />
                  </ScrollProvider>
                </QuickPlayProvider>
              </BackgroundPlayProvider>
            </RevenueCatProvider>
          </AccessibilityProvider>
        </NotificationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#0A0903" }}>
      <OnboardingProvider>
        <RootLayoutContent />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}
