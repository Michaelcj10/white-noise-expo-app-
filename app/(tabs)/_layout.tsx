// app/(tabs)/_layout.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useQuickPlay } from "@/contexts/quickplay";
import { useScroll } from "@/contexts/scroll";
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
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  // Load favorite sound on mount
  useEffect(() => {
    loadFavoriteSound();
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const hasSeenOnboarding = await Storage.getItem("has_seen_onboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

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
  }, []);

  const handlePanicPress = async () => {
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!favoriteSoundId) {
      setShowNoQuickPlayModal(true);
      return;
    }

    const favoriteSound = WHITE_NOISE_SOUNDS.find(
      (s) => String(s.id) === favoriteSoundId
    );

    if (!favoriteSound) {
      Alert.alert("Error", "Favorite sound not found");
      return;
    }

    try {
      if (quickPlaySound && isQuickPlaying) {
        // Stop current quick play
        await quickPlaySound.stopAsync();
        await quickPlaySound.unloadAsync();
        setQuickPlaySound(null);
        setIsQuickPlaying(false);
      } else {
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
          }
        );

        newSound.setOnPlaybackStatusUpdate((status) => {
          if ((status as any).isLoaded) {
            setIsQuickPlaying((status as any).isPlaying);
          }
        });

        setQuickPlaySound(newSound);
        setIsQuickPlaying(true);
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

  // Custom panic button component
  const PanicButton = () => {
    const favoriteSound = WHITE_NOISE_SOUNDS.find(
      (s) => String(s.id) === favoriteSoundId
    );

    return (
      <TouchableOpacity
        onPress={handlePanicPress}
        style={{
          position: "relative",
          top: -15,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isQuickPlaying ? theme.error : theme.success,
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
            paddingTop: 0,
            paddingBottom: 8,
            height: 100,
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
            title: favoriteSoundId ? "Quick Play" : "Set Quick Play",
            tabBarIcon: ({ color, focused }) => <PanicButton />,
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent navigation to a "panic" screen
              e.preventDefault();
              handlePanicPress();
            },
            tabLongPress: (e) => {
              // Also handle long press
              handlePanicPress();
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

      {/* Onboarding Modal */}
      <Modal visible={showOnboarding} animationType="slide" transparent={false}>
        <LinearGradient
          colors={
            themeMode === "dark"
              ? ["#000000", "#1a1a1a", "#2d2d2d"]
              : ["#ffffff", "#f5f5f5", "#e0e0e0"]
          }
          style={{ flex: 1 }}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View
            style={{
              flex: 1,
              padding: 24,
              justifyContent: "space-between",
            }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: 40,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: "center", marginBottom: 40 }}>
                <Image
                  source={themeMode === "dark" ? darkLogo : whiteLogo}
                  style={{
                    width: 200,
                    height: 80,
                    marginBottom: 24,
                  }}
                  contentFit="contain"
                />
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: theme.text,
                    marginBottom: 12,
                    textAlign: "center",
                  }}
                >
                  Welcome to Slumbr
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    color: theme.textSecondary,
                    textAlign: "center",
                    lineHeight: 26,
                  }}
                >
                  Your peaceful sanctuary for relaxation and focus
                </Text>
              </View>

              <View style={{ gap: 32 }}>
                {/* Feature 1 */}
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: theme.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons
                      name="musical-notes"
                      size={28}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      Curated Sounds
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.textSecondary,
                        lineHeight: 24,
                      }}
                    >
                      Choose from a variety of high-quality white noise, nature
                      sounds, and ambient audio to help you relax, sleep, or
                      concentrate.
                    </Text>
                  </View>
                </View>

                {/* Feature 2 */}
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: theme.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons name="heart" size={28} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      Favorites & Quick Play
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.textSecondary,
                        lineHeight: 24,
                      }}
                    >
                      Save your favorite sounds and set up quick play for
                      instant access to your most-loved audio.
                    </Text>
                  </View>
                </View>

                {/* Feature 3 */}
                <View
                  style={{ flexDirection: "row", alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: theme.primary + "15",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons name="layers" size={28} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      Mix & Match
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.textSecondary,
                        lineHeight: 24,
                      }}
                    >
                      Create your perfect soundscape by mixing multiple sounds
                      together with independent volume controls.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Fixed button at bottom */}
            <View style={{ paddingTop: 24, paddingBottom: 20 }}>
              <TouchableOpacity
                onPress={completeOnboarding}
                style={{
                  backgroundColor: theme.primary,
                  padding: 18,
                  borderRadius: 16,
                  alignItems: "center",
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  Get Started
                </Text>
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
                onPress={() => {
                  setShowNoQuickPlayModal(false);
                  router.push("/settings");
                }}
                style={{
                  backgroundColor: theme.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
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
                  backgroundColor: theme.border,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.text,
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
