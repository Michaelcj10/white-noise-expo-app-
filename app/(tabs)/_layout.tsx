// app/(tabs)/_layout.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Tabs, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { Alert, Platform, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../contexts/themecontext";

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
  const [favoriteSoundId, setFavoriteSoundId] = useState<string | null>(null);
  const [quickPlaySound, setQuickPlaySound] = useState<any>(null);
  const [isQuickPlaying, setIsQuickPlaying] = useState(false);

  // Load favorite sound on mount
  useEffect(() => {
    loadFavoriteSound();
  }, []);

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
    if (!favoriteSoundId) {
      Alert.alert(
        "No Favorite Sound",
        "Please select a favorite sound in Settings first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => router.push("/settings") },
        ]
      );
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
          backgroundColor: isQuickPlaying
            ? theme.error
            : favoriteSound?.color || theme.primary,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: 3,
          borderColor: theme.background,
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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 8,
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
      />

      <Tabs.Screen
        redirect={false}
        name="panic"
        options={{
          title: favoriteSoundId ? "Quick Play" : "Set Favorite",
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
      />
    </Tabs>
  );
}
