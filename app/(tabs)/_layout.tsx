// app/(tabs)/_layout.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useQuickPlay } from "@/contexts/quickplay";
import { useScroll } from "@/contexts/scroll";
import { Analytics } from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/themecontext";

const darkLogo = require("../../assets/images/slumbr_logo_dark.svg");
const whiteLogo = require("../../assets/images/slumbr_logo_light.svg");

// Storage helper (same as in settings)
const Storage = {
  async getItem(key: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
};

export default function TabLayout() {
  const { theme, themeMode } = useTheme();
  const router = useRouter();
  const { scrollToTop } = useScroll();
  const insets = useSafeAreaInsets();
  const {
    favoriteSoundId,
    setFavoriteSoundId,
    isQuickPlaying,
    setIsQuickPlaying,
    stopMainSounds,
  } = useQuickPlay();
  const [quickPlaySound, setQuickPlaySound] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNoQuickPlayModal, setShowNoQuickPlayModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Onboarding screens data
  const onboardingScreens = [
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
  ];

  const currentScreen = onboardingScreens[onboardingStep];

  // Load favorite sound on mount
  useEffect(() => {
    const initializeApp = async () => {
      const storedId = await Storage.getItem("favorite_sound_id");
      setFavoriteSoundId(storedId);

      const hasSeenOnboarding = await Storage.getItem("has_seen_onboarding");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    };
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeOnboarding = async () => {
    await Storage.setItem("has_seen_onboarding", "true");
    setShowOnboarding(false);
  };

  const loadFavoriteSound = async () => {
    const storedId = await Storage.getItem("favorite_sound_id");
    setFavoriteSoundId(storedId);
  };

  // Reload favorite when tab changes (in case it was updated in settings)
  useEffect(() => {
    const interval = setInterval(loadFavoriteSound, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePanicPress = async (
    e?: { preventDefault?: () => void } | any,
  ) => {
    if (e && typeof (e as any).preventDefault === "function") {
      (e as any).preventDefault();
    }

    if (!favoriteSoundId) {
      // Light haptic for error/no action
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowNoQuickPlayModal(true);
      return;
    }

    const favoriteSound = WHITE_NOISE_SOUNDS.find(
      (s) => String(s.id) === favoriteSoundId,
    );

    if (!favoriteSound) {
      Alert.alert("Error", "Favorite sound not found");
      return;
    }

    try {
      if (quickPlaySound && isQuickPlaying) {
        // Medium haptic feedback for stopping
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Stop current quick play
        await quickPlaySound.stopAsync();
        await quickPlaySound.unloadAsync();
        setQuickPlaySound(null);
        setIsQuickPlaying(false);

        // Track quick play stopped
        Analytics.trackQuickPlayStopped();
      } else {
        // Heavy haptic feedback for starting quick play (emergency action)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Stop main screen sounds if any are playing
        if (stopMainSounds && typeof stopMainSounds === "function") {
          await stopMainSounds();
        }

        // Start quick play
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          favoriteSound.source,
          {
            isLooping: true,
            volume: 0.5,
            shouldPlay: true,
          },
        );

        newSound.setOnPlaybackStatusUpdate((status) => {
          if ((status as any).isLoaded) {
            setIsQuickPlaying((status as any).isPlaying);
          }
        });

        setQuickPlaySound(newSound);
        setIsQuickPlaying(true);

        // Track quick play used
        Analytics.trackQuickPlayUsed(favoriteSound.id, favoriteSound.name);
      }
    } catch (error) {
      Alert.alert("Error", "Could not play sound");
      console.error("Error playing quick sound:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (quickPlaySound) {
        quickPlaySound.unloadAsync();
      }
    };
  }, [quickPlaySound]);

  // Animation for panic button
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleButtonPress = (e: { preventDefault: () => void } | undefined) => {
    // Immediate light haptic feedback on button press for responsiveness
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateButtonPress();
    handlePanicPress(e);
  };

  // Custom panic button component
  const PanicButton = () => {
    const favoriteSound = WHITE_NOISE_SOUNDS.find(
      (s) => String(s.id) === favoriteSoundId,
    );

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handleButtonPress}
          style={{
            position: "relative",
            top: -15,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.primary,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 3,
            borderColor: "transparent",
          }}
        >
          <Ionicons
            name={
              isQuickPlaying
                ? "stop"
                : ((favoriteSound?.icon ||
                    "heart") as keyof typeof Ionicons.glyphMap)
            }
            size={28}
            color="white"
          />
          {isQuickPlaying && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: theme.success,
                borderWidth: 2,
                borderColor: theme.background,
              }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 24,
            height: 70 + (insets.bottom > 0 ? insets.bottom + 4 : 24),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: themeMode === "dark" ? 0.1 : 0.05,
            shadowRadius: 4,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Sounds",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="radio"
                size={focused ? 28 : 24}
                color={color}
                style={{
                  transform: [{ scale: focused ? 1.1 : 1 }],
                }}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              scrollToTop();
            },
          }}
        />

        <Tabs.Screen
          redirect={false}
          name="panic"
          options={{
            title: favoriteSoundId
              ? WHITE_NOISE_SOUNDS.find(
                  (s) => String(s.id) === favoriteSoundId,
                )?.name.substring(0, 12) || "Quick Play"
              : "Set Quick Play",
            tabBarIcon: ({ color, focused }) => <PanicButton />,
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent navigation to a "panic" screen
              e.preventDefault();
              handlePanicPress(e);
            },
            tabLongPress: (e) => {
              // Also handle long press
              handlePanicPress(e);
            },
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name="settings"
                size={focused ? 28 : 24}
                color={color}
                style={{
                  transform: [
                    { scale: focused ? 1.1 : 1 },
                    { rotate: focused ? "15deg" : "0deg" },
                  ],
                }}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              scrollToTop();
            },
          }}
        />
      </Tabs>

      {/* Onboarding Modal - Multi-step Carousel */}
      <Modal visible={showOnboarding} animationType="slide" transparent={false}>
        <LinearGradient
          colors={
            themeMode === "dark"
              ? ["#0a0a0a", "#1a1a2e", "#16213e", "#0f3460"]
              : ["#f8f9ff", "#f0f4ff", "#e8f0ff", "#e0ecff"]
          }
          style={{ flex: 1 }}
          locations={[0, 0.3, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {/* Subtle background pattern overlay */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "100%",
              opacity: 0.03,
              pointerEvents: "none",
            }}
          >
            <LinearGradient
              colors={["rgba(59, 130, 246, 0.2)", "rgba(99, 102, 241, 0.2)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
          </View>

          <View
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: insets.top }}
          >
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
              <Image
                source={themeMode === "dark" ? darkLogo : whiteLogo}
                style={{
                  width: 120,
                  height: 48,
                }}
                contentFit="contain"
              />
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
              {onboardingScreens.map((_, index) => (
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
              <View style={{ alignItems: "center", marginBottom: 40 }}>
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
            </ScrollView>

            {/* Navigation Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 32,
                paddingBottom: insets.bottom,
              }}
            >
              {onboardingStep > 0 && (
                <TouchableOpacity
                  onPress={() => setOnboardingStep(onboardingStep - 1)}
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
                onPress={() => {
                  if (onboardingStep < onboardingScreens.length - 1) {
                    setOnboardingStep(onboardingStep + 1);
                  } else {
                    completeOnboarding();
                  }
                }}
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
                  {onboardingStep === onboardingScreens.length - 1
                    ? "Get Started"
                    : "Next"}
                </Text>
                <Ionicons
                  name={
                    onboardingStep === onboardingScreens.length - 1
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
      </Modal>

      {/* No Quick Play Sound Modal */}
      <Modal visible={showNoQuickPlayModal} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View
              style={{
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: theme.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="flash-off" size={32} color={theme.primary} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No Quick Play Sound
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                Please select a quick play sound in Settings first.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={(e) => {
                  e.preventDefault();
                  setShowNoQuickPlayModal(false);
                  router.push("/(tabs)/settings");
                }}
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Ionicons name="settings" size={18} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Go to Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowNoQuickPlayModal(false)}
                style={{
                  backgroundColor: theme.error,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Ionicons name="close" size={18} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
