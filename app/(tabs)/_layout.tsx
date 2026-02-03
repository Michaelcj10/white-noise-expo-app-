// app/(tabs)/_layout.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useQuickPlay } from "@/contexts/quickplay";
import { useScroll } from "@/contexts/scroll";
import { useToast } from "@/contexts/toast";
import { Analytics } from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { Animated, Modal, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/themecontext";

// Storage helper (same as in settings)
const Storage = {
  async getItem(key: string) {
    try {
      // Check if we're on web platform with localStorage available
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          console.warn(`localStorage not available for key ${key}`);
        }
      }
      // Native platform - try SecureStore
      if (
        typeof SecureStore !== "undefined" &&
        typeof SecureStore.getItemAsync === "function"
      ) {
        return await SecureStore.getItemAsync(key);
      }
      return null;
    } catch (error) {
      console.warn(`Error reading ${key}:`, error);
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      // Check if we're on web platform with localStorage available
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem(key, value);
          return;
        } catch {
          console.warn(`localStorage not available for key ${key}`);
        }
      }
      // Native platform - try SecureStore
      if (
        typeof SecureStore !== "undefined" &&
        typeof SecureStore.setItemAsync === "function"
      ) {
        return await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn(`Error writing ${key}:`, error);
    }
  },
};

export default function TabLayout() {
  const { theme, themeMode } = useTheme();
  const router = useRouter();
  const { scrollToTop } = useScroll();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const {
    favoriteSoundId,
    setFavoriteSoundId,
    isQuickPlaying,
    setIsQuickPlaying,
    stopMainSounds,
  } = useQuickPlay();
  const [quickPlaySound, setQuickPlaySound] = useState<any>(null);
  const [showNoQuickPlayModal, setShowNoQuickPlayModal] = useState(false);

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
      showToast("Favorite sound not found", "error");
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
      showToast("Could not play sound", "error");
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
