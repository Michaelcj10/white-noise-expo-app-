import { PaywallModal } from "@/components/PaywallModal";
import { SoundCardSkeleton } from "@/components/ShimmerLoader";
import {
  CATEGORY_COLORS,
  SOUND_CATEGORIES,
  SoundCategory,
  WHITE_NOISE_SOUNDS,
} from "@/constants/sound";
import { Analytics } from "@/utils/analytics";
import { soundCache } from "@/utils/soundCache";
import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";

import { useAccessibility } from "@/contexts/accessibility";
import { useQuickPlay } from "@/contexts/quickplay";
import { useRevenueCat } from "@/contexts/revenuecat";
import { useScroll } from "@/contexts/scroll";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBackgroundPlay } from "../../contexts/backgroundplay";
import { themes, useTheme } from "../../contexts/themecontext";
import {
  hidePlayingNotification,
  NOTIFICATION_ACTIONS,
  setupAudioNotifications,
  showPlayingNotification,
} from "../../utils/audioNotification";

/* ---------- Platform helpers ---------- */
const isWeb = Platform.OS === "web";

/* ---------- Storage (web-safe) ---------- */
const FAVORITES_KEY = "favorite_sound_ids";

const getHighContrastTheme = (baseTheme: typeof themes.dark) => ({
  ...baseTheme,
  background: "#000000",
  surface: "#000000",
  card: "#000000",
  border: "#ffffff",
  tabBarBorder: "#ffffff",
  text: "#ffffff",
  sectionHeader: "#ffffff",
  tabBar: "#000000",
  switchTrackOff: "#333333",
  switchThumbOff: "#ffffff",
});

const Storage = {
  async getItem(key: string) {
    if (isWeb && typeof window !== "undefined") {
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (isWeb && typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
};

/* ---------- Mixer Modal ---------- */
function MixerModal({
  visible,
  onClose,
  theme,
  activeSounds,
  onToggleSound,
  onVolumeChange,
  favorites,
  onToggleFavorite,
  pro,
  isPlaying,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
  activeSounds: Map<
    number,
    { sound: any; soundItem: any; volume: number; isMuted: boolean }
  >;
  onToggleSound: (soundItem: any) => void;
  onVolumeChange: (soundId: number, volume: number) => void;
  favorites: Set<number>;
  onToggleFavorite: (soundId: number) => void;
  pro: boolean;
  isPlaying: boolean;
}) {
  useEffect(() => {
    const volumes = new Map<number, number>();
    activeSounds.forEach((data, id) => {
      volumes.set(id, data.volume);
    });
  }, [activeSounds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#0006",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            borderTopWidth: 1,
            borderColor: theme.border,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              Sound Mixer
            </Text>
          </View>
          <Text
            style={{
              opacity: 0.7,
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            Mix multiple sounds together
          </Text>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={{
              padding: 12,
              alignItems: "center",
              marginBottom: 12,
              backgroundColor: theme.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>Done</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {WHITE_NOISE_SOUNDS.map((soundItem) => {
              const isActive = activeSounds.has(soundItem.id);
              const isLocked = soundItem.premium && !pro;

              // First sound in the map is the original sound that started playing
              const firstSoundId =
                activeSounds.size > 0
                  ? Array.from(activeSounds.keys())[0]
                  : null;
              const isFirstSound = isActive && soundItem.id === firstSoundId;
              const cannotUnselect =
                isFirstSound && isPlaying && activeSounds.size > 1;

              return (
                <View
                  key={soundItem.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: isActive ? theme.card : theme.background,
                    borderWidth: 1,
                    borderColor: isActive ? theme.primary : theme.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: soundItem.color,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={
                          soundItem.icon as React.ComponentProps<
                            typeof Ionicons
                          >["name"]
                        }
                        size={20}
                        color="white"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        {soundItem.name}
                      </Text>
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 12 }}
                      >
                        {soundItem.description}
                      </Text>
                    </View>
                    {isLocked ? (
                      <View
                        style={{
                          backgroundColor: "#8b5cf6",
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          marginRight: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 10,
                            fontWeight: "700",
                            letterSpacing: 0.5,
                          }}
                        >
                          PRO
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          onToggleFavorite(soundItem.id);
                        }}
                        style={{
                          padding: 8,
                          marginRight: 8,
                        }}
                      >
                        <Ionicons
                          name={
                            favorites?.has(soundItem.id)
                              ? "heart"
                              : "heart-outline"
                          }
                          size={24}
                          color={
                            favorites?.has(soundItem.id)
                              ? "#FF6B6B"
                              : theme.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    )}
                    {cannotUnselect && (
                      <Ionicons
                        name="lock-closed"
                        size={16}
                        color={theme.textSecondary}
                        style={{ marginRight: 8, opacity: 0.6 }}
                      />
                    )}
                    <Switch
                      value={isActive}
                      onValueChange={() => onToggleSound(soundItem)}
                      disabled={cannotUnselect}
                      trackColor={{
                        false: theme.border,
                        true: theme.primary,
                      }}
                      thumbColor={isActive ? "white" : theme.textSecondary}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Timer Modal ---------- */
function TimerModal({
  visible,
  onClose,
  onSetTimer,
  theme,
  currentTimer,
}: {
  visible: boolean;
  onClose: () => void;
  onSetTimer: (minutes: number | null) => void;
  theme: any;
  currentTimer: number | null;
}) {
  const [isVisible, setIsVisible] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setIsVisible(true);
    }
  }, [visible]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSelectTimer = (value: number | null) => {
    onSetTimer(value);
    handleClose();
  };

  const timerOptions = [
    { label: "No Timer", value: null },
    { label: "5 minutes", value: 5 },
    { label: "10 minutes", value: 10 },
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "45 minutes", value: 45 },
    { label: "1 hour", value: 60 },
    { label: "90 minutes", value: 90 },
    { label: "2 hours", value: 120 },
  ];

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#0006",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            borderTopWidth: 1,
            borderColor: theme.border,
            maxHeight: "70%",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleClose();
            }}
            style={{
              padding: 12,
              alignItems: "center",
              marginBottom: 12,
              backgroundColor: theme.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>Done</Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              Sleep Timer
            </Text>
          </View>
          <Text
            style={{
              opacity: 0.7,
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            Set how long the sound should play
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {timerOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectTimer(option.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor:
                    currentTimer === option.value
                      ? theme.primary + "20"
                      : theme.card,
                  marginBottom: 8,
                  borderWidth: currentTimer === option.value ? 2 : 1,
                  borderColor:
                    currentTimer === option.value
                      ? theme.primary
                      : theme.border,
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.value === null ? "close-circle" : "timer"}
                  size={24}
                  color={
                    currentTimer === option.value
                      ? theme.primary
                      : theme.textSecondary
                  }
                />
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: currentTimer === option.value ? "600" : "400",
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  {option.label}
                </Text>
                {currentTimer === option.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ================== EMPTY STATE ================== */
function EmptyPlayerState({ theme }: { theme: any }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 32,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
          marginBottom: 24,
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.primary + "20",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="musical-notes" size={48} color={theme.primary} />
        </View>
      </Animated.View>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        No Sounds Playing
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: theme.textSecondary,
          textAlign: "center",
          lineHeight: 24,
        }}
      >
        Tap on any sound below to start your relaxing experience
      </Text>
    </View>
  );
}

/* ================== NETWORK DETECTION ================== */
/**
 * Check if device has internet connectivity
 * Returns false for airplane mode or no internet
 */
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    const isConnected =
      state.isConnected === true && state.isInternetReachable === true;
    console.log(`📡 Network status: ${isConnected ? "ONLINE" : "OFFLINE"}`);
    return isConnected;
  } catch {
    console.log("📡 Network check failed, assuming offline");
    return false;
  }
};

/* ================== SAFE ANALYTICS WRAPPER ================== */
/**
 * Wraps all analytics calls to gracefully handle offline/airplane mode
 * Prevents any network errors from blocking app functionality
 */
const safeAnalytics = {
  trackSoundPlayed: (
    id: number,
    name: string,
    premium: boolean,
    mode: "single" | "mixer",
  ) => {
    try {
      Analytics.trackSoundPlayed(id, name, premium, mode);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackSoundPaused: () => {
    try {
      Analytics.trackSoundPaused();
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackSoundResumed: () => {
    try {
      Analytics.trackSoundResumed();
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackAllSoundsStopped: (count: number) => {
    try {
      Analytics.trackAllSoundsStopped(count);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackTimerSet: (minutes: number) => {
    try {
      Analytics.trackTimerSet(minutes);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackTimerCleared: () => {
    try {
      Analytics.trackTimerCleared();
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackTimerCompleted: (minutes: number) => {
    try {
      Analytics.trackTimerCompleted(minutes);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackPaywallViewed: (
    source:
      | "offline_limit"
      | "mixer"
      | "premium_sound"
      | "banner"
      | "settings"
      | "favorite",
  ) => {
    try {
      Analytics.trackPaywallViewed(source);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackFavoriteAdded: (id: number, name: string, premium: boolean) => {
    try {
      Analytics.trackFavoriteAdded(id, name, premium);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackFavoriteRemoved: (id: number, name: string) => {
    try {
      Analytics.trackFavoriteRemoved(id, name);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackSoundDownloaded: (id: number, name: string) => {
    try {
      Analytics.trackSoundDownloaded(id, name);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  trackCategorySelected: (category: string, count: number) => {
    try {
      Analytics.trackCategorySelected(category, count);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
  incrementUserProperty: (property: string, value: number) => {
    try {
      Analytics.incrementUserProperty(property, value);
    } catch {
      console.log("📊 Analytics unavailable (offline)");
    }
  },
};

/* ================== MAIN SCREEN ================== */
export default function SoundsScreen() {
  const { theme: baseTheme, themeMode } = useTheme();
  const { backgroundPlayEnabled } = useBackgroundPlay();
  const {
    isQuickPlaying,
    favoriteSoundId,
    setIsMainPlaying,
    setStopMainSounds,
  } = useQuickPlay();
  const { setScrollViewRef } = useScroll();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { textSize, highContrastMode } = useAccessibility();

  // Use high contrast theme if enabled
  const theme = highContrastMode ? getHighContrastTheme(baseTheme) : baseTheme;

  // Helper function to apply text size multiplier
  const getScaledFontSize = (baseSize: number): number => {
    switch (textSize) {
      case "small":
        return Math.round(baseSize * 0.85);
      case "large":
        return Math.round(baseSize * 1.15);
      default:
        return baseSize;
    }
  };

  // Multiple sounds support
  const [activeSounds, setActiveSounds] = useState<
    Map<
      number,
      {
        id: number;
        sound: any;
        soundItem: any;
        volume: number;
        isMuted: boolean;
      }
    >
  >(new Map());

  const [selectedCategory, setSelectedCategory] = useState<
    SoundCategory | "Favourites" | "Downloaded"
  >(SOUND_CATEGORIES.ALL);

  const [isPlaying, setIsPlaying] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [loadingSounds, setLoadingSounds] = useState<Set<number>>(new Set());
  const [selectedSounds, setSelectedSounds] = useState<Set<number>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [mixerModalVisible, setMixerModalVisible] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // RevenueCat - check if user has Pro access
  const { isPro: pro } = useRevenueCat();

  // Pro Banner dismiss state
  const [proBannerDismissed, setProBannerDismissed] = useState(false);

  // Volume warning state
  const [showVolumeWarning, setShowVolumeWarning] = useState(false);
  const [volumeWarningDismissed, setVolumeWarningDismissed] = useState(false);

  // Paywall state
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Downloaded sounds state - local sounds (0: white noise, 1: rain, 2: ocean) are pre-downloaded
  const [downloadedSounds, setDownloadedSounds] = useState<Set<number>>(
    new Set([0, 1, 2]),
  );

  // Downloading sounds state - track which sounds are currently being downloaded
  const [downloadingStates, setDownloadingStates] = useState<Set<number>>(
    new Set(),
  );

  // Snackbar state for favorites and download feedback - supports multiple toasts
  const [snackbars, setSnackbars] = useState<
    {
      id: number;
      message: string;
      opacity: Animated.Value;
      translateY: Animated.Value;
    }[]
  >([]);
  const snackbarIdCounter = useRef(0);

  const playerSlide = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const handleClosePlayer = () => {
    Animated.parallel([
      Animated.timing(playerSlide, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      stopAllSounds();
    });
  };

  const configureAudioSession = useCallback(async () => {
    try {
      if (Audio?.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: backgroundPlayEnabled && !isWeb,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });
      }
    } catch (error) {
      console.error("Error configuring audio session:", error);
    }
  }, [backgroundPlayEnabled]);

  // Configure audio session once at startup
  useEffect(() => {
    let mounted = true;

    const initAudio = async () => {
      if (!mounted) return;

      try {
        // Initialize sound cache for offline support
        await soundCache.initialize();

        // Load downloaded sounds into state
        const downloadedIds = soundCache.getDownloadedSoundIds();
        setDownloadedSounds(new Set(downloadedIds));
        console.log(`📦 Loaded ${downloadedIds.length} cached sounds`);

        await configureAudioSession();
        setupAudioNotifications();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        if (backgroundPlayEnabled && activeSounds.size > 0 && isPlaying) {
          // keep playing
        } else if (
          !backgroundPlayEnabled &&
          activeSounds.size > 0 &&
          isPlaying
        ) {
          pauseAllSounds();
        }
      } else if (nextAppState === "active") {
        refreshSoundState();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundPlayEnabled, activeSounds, isPlaying]);

  // Timer logic
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timerMinutes !== null && isPlaying && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const newSeconds = prev - 1;
          if (newSeconds <= 0) {
            // Timer finished - schedule stop for next render cycle
            safeAnalytics.trackTimerCompleted(timerMinutes);
            return 0;
          }
          return newSeconds;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerMinutes, isPlaying, timerSeconds]);

  // Handle timer completion
  useEffect(() => {
    if (timerMinutes !== null && timerSeconds === 0 && isPlaying) {
      // Timer completed - stop all sounds
      const timeoutId = setTimeout(() => {
        stopAllSounds();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds, timerMinutes, isPlaying]);

  // Sync main playing state to context for quick play button
  useEffect(() => {
    setIsMainPlaying(isPlaying);
  }, [isPlaying, setIsMainPlaying]);

  const updateNowPlayingInfo = async () => {
    try {
      if (!isWeb && activeSounds.size > 0) {
        const soundNames = Array.from(activeSounds.values())
          .map((data) => data.soundItem?.name || "Unknown")
          .join(", ");
        console.log("Now Playing:", soundNames);
      }
    } catch (error) {
      console.error("Error updating now playing info:", error);
    }
  };

  const refreshSoundState = useCallback(async () => {
    let hasPlaying = false;

    for (const [, data] of activeSounds.entries()) {
      try {
        const status = await data.sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          hasPlaying = true;
        }
      } catch (error) {
        console.error("Error refreshing sound state:", error);
      }
    }

    setIsPlaying(hasPlaying);
  }, [activeSounds]);

  useEffect(() => {
    return () => {
      // Cleanup all sounds on unmount
      activeSounds.forEach((data) => {
        data.sound.unloadAsync();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update lock screen info when active sounds change
  useEffect(() => {
    updateNowPlayingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSounds, isPlaying]);

  useEffect(() => {
    if (activeSounds.size > 0 || selectedSounds.size > 0) {
      Animated.parallel([
        Animated.spring(playerSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(playerSlide, {
          toValue: 300,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeSounds.size, selectedSounds.size, playerSlide, overlayOpacity]);

  // Load favorites from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await Storage.getItem(FAVORITES_KEY);
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            setFavorites(new Set(ids));
          } else {
            console.error("Invalid favorites format, resetting");
            setFavorites(new Set());
          }
        }
      } catch (error) {
        console.error("Error loading favorites:", error);
        setFavorites(new Set());
      } finally {
        setTimeout(() => setIsInitialLoad(false), 800);
      }
    };
    loadFavorites();
  }, []);

  // Reload favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        try {
          const stored = await Storage.getItem(FAVORITES_KEY);
          if (stored) {
            const ids = JSON.parse(stored);
            if (Array.isArray(ids)) {
              setFavorites(new Set(ids));
            } else {
              console.error("Invalid favorites format, resetting");
              setFavorites(new Set());
            }
          } else {
            setFavorites(new Set());
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
          setFavorites(new Set());
        }
      };
      loadFavorites();
    }, []),
  );

  // Save favorites to storage whenever they change
  const saveFavorites = async (newFavorites: Set<number>) => {
    try {
      const ids = Array.from(newFavorites);
      await Storage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  // Toggle favorite
  const toggleFavorite = (soundId: number) => {
    const sound = WHITE_NOISE_SOUNDS.find((s) => s.id === soundId);
    const isPremium = sound?.premium || false;

    if (isPremium && !pro) {
      safeAnalytics.trackPaywallViewed("favorite");
      setPaywallOpen(true);
      return;
    }

    const newFavorites = new Set(favorites);

    if (newFavorites.has(soundId)) {
      newFavorites.delete(soundId);
      showSnackbar("Removed from favorites");
      safeAnalytics.trackFavoriteRemoved(soundId, sound?.name || "Unknown");

      if (selectedCategory === "Favourites" && newFavorites.size === 0) {
        setSelectedCategory(SOUND_CATEGORIES.ALL);
      }
    } else {
      newFavorites.add(soundId);
      showSnackbar("Added to favorites");
      safeAnalytics.trackFavoriteAdded(
        soundId,
        sound?.name || "Unknown",
        isPremium,
      );
      safeAnalytics.incrementUserProperty("total_favorites_added", 1);
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  // Show snackbar animation with stacking support
  const showSnackbar = useCallback((message: string) => {
    const id = snackbarIdCounter.current++;
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(0);

    setSnackbars((prev) => {
      prev.forEach((snackbar, index) => {
        Animated.timing(snackbar.translateY, {
          toValue: (index + 1) * 70,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });

      return [...prev, { id, message, opacity, translateY }];
    });

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSnackbars((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        filtered.forEach((snackbar, index) => {
          Animated.timing(snackbar.translateY, {
            toValue: index * 70,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
        return filtered;
      });
    });
  }, []);

  // Toggle sound in mixer
  const toggleSoundInMixer = async (soundItem: any) => {
    const newActiveSounds = new Map(activeSounds);

    if (newActiveSounds.has(soundItem.id)) {
      // Sound is active - remove it
      const data = newActiveSounds.get(soundItem.id);
      if (data?.sound) {
        try {
          data.sound.setOnPlaybackStatusUpdate(null);
          await data.sound.stopAsync();
          await data.sound.unloadAsync();
        } catch (error) {
          console.error(`Error cleaning up sound ${soundItem.id}:`, error);
        }
      }
      newActiveSounds.delete(soundItem.id);
      setActiveSounds(newActiveSounds);
    } else {
      // 🆕 LIMIT: Max 3 sounds in mixer
      if (newActiveSounds.size >= 3) {
        showSnackbar("Maximum 3 sounds can be mixed together");
        console.log("⚠️  Mixer limit reached: max 3 sounds");
        return;
      }

      // Sound is not active - add it
      try {
        setLoadingSounds((prev) => new Set(prev).add(soundItem.id));

        const source = await soundCache.getSource(soundItem, true, true);

        if (!soundCache.isDownloaded(soundItem.id)) {
          soundCache.onDownloadComplete(
            soundItem.id,
            (completedId: number, success: boolean) => {
              if (success) {
                setDownloadedSounds((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(completedId);
                  return newSet;
                });
                const sound = WHITE_NOISE_SOUNDS.find(
                  (s) => s.id === completedId,
                );
                if (sound) {
                  showSnackbar(`${sound.name} saved for offline`);
                  safeAnalytics.trackSoundDownloaded(completedId, sound.name);
                }
              } else {
                const sound = WHITE_NOISE_SOUNDS.find(
                  (s) => s.id === completedId,
                );
                if (sound) {
                  showSnackbar(`Failed to save ${sound.name} for offline`);
                }
              }
            },
          );
        }

        if (
          soundCache.isDownloaded(soundItem.id) &&
          !downloadedSounds.has(soundItem.id)
        ) {
          setDownloadedSounds((prev) => {
            const newSet = new Set(prev);
            newSet.add(soundItem.id);
            return newSet;
          });
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          source,
          {
            isLooping: true,
            volume: globalMuted ? 0 : 0.5,
            shouldPlay: false,
            progressUpdateIntervalMillis: 1000,
            androidImplementation: "MediaPlayer",
          },
          (status) => {
            if (
              status.isLoaded &&
              status.durationMillis &&
              status.durationMillis > 0
            ) {
              setLoadingSounds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(soundItem.id);
                return newSet;
              });
            }
          },
          false,
        );

        setLoadingSounds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });

        if (isPlaying) {
          console.log(
            `⏯️  Triggering playback for mixer sound ${soundItem.id}...`,
          );
          newSound.playAsync().catch((err) => {
            console.error(`Error playing mixer sound ${soundItem.id}:`, err);
          });
        }

        newActiveSounds.set(soundItem.id, {
          sound: newSound,
          soundItem,
          volume: 0.5,
          isMuted: globalMuted,
          id: soundItem.id,
        });

        setActiveSounds(newActiveSounds);
      } catch (error) {
        setLoadingSounds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });

        Alert.alert(
          "Error",
          "Could not load sound. Please check your internet connection.",
        );
        console.error("Error playing sound:", error);
        return;
      }
    }

    // Update playing state
    if (newActiveSounds.size > 0 && !isPlaying) {
      setIsPlaying(true);
    } else if (newActiveSounds.size === 0) {
      setIsPlaying(false);
    }
  };

  // Change volume for specific sound
  const changeSoundVolume = async (soundId: number, volume: number) => {
    const newActiveSounds = new Map(activeSounds);
    const data = newActiveSounds.get(soundId);

    if (data?.sound) {
      try {
        data.volume = volume;
        if (!data.isMuted && !globalMuted) {
          await data.sound.setVolumeAsync(volume);
        }
        setActiveSounds(newActiveSounds);
      } catch (error) {
        console.error(`Error changing volume for sound ${soundId}:`, error);
      }
    }
  };

  // Download sound for offline use
  const handleDownloadSound = useCallback(
    async (soundItem: any) => {
      console.log(
        `🎯 [handleDownloadSound] Clicked for sound ${soundItem.id} - ${soundItem.name}`,
      );

      const isFreeDownloadable = !soundItem.premium;

      if (!pro && !isFreeDownloadable) {
        console.log(
          `🎯 [handleDownloadSound] Free user tried to download pro sound`,
        );
        showSnackbar("Upgrade to Pro to save sounds for offline use");
        safeAnalytics.trackPaywallViewed("offline_limit");
        setPaywallOpen(true);
        return;
      }

      if (soundItem.isLocal) {
        console.log(`🎯 [handleDownloadSound] Skipping - local sound`);
        return;
      }

      if (downloadingStates.has(soundItem.id)) {
        console.log(
          `🎯 [handleDownloadSound] Already downloading, ignoring duplicate`,
        );
        return;
      }

      try {
        // Check network connectivity first
        const isOnline = await checkNetworkConnectivity();
        if (!isOnline) {
          showSnackbar(
            "Cannot download in offline mode. Please check your internet connection.",
          );
          console.log(`🎯 [handleDownloadSound] Device is offline`);
          return;
        }

        console.log(
          `🎯 [handleDownloadSound] Setting downloading state for ${soundItem.id}`,
        );
        setDownloadingStates((prev) => new Set(prev).add(soundItem.id));

        console.log(
          `🎯 [handleDownloadSound] Calling soundCache.initiateDownload with pro=${pro}`,
        );
        const success = await soundCache.initiateDownload(soundItem, pro);
        console.log(
          `🎯 [handleDownloadSound] initiateDownload returned: ${success} for sound ${soundItem.id}`,
        );

        if (success) {
          console.log(
            `🎯 [handleDownloadSound] Marking ${soundItem.id} as downloaded`,
          );
          setDownloadedSounds((prev) => new Set(prev).add(soundItem.id));

          showSnackbar(`${soundItem.name} saved for offline use!`);
          safeAnalytics.trackSoundDownloaded(soundItem.id, soundItem.name);
        } else {
          console.log(
            `🎯 [handleDownloadSound] Download failed for ${soundItem.id}`,
          );
          if (!pro && !soundCache.canDownloadMore(pro)) {
            showSnackbar(
              `Free users can save 1 offline sound. Upgrade to Pro for unlimited.`,
            );
            safeAnalytics.trackPaywallViewed("offline_limit");
            setPaywallOpen(true);
          } else {
            showSnackbar(`Failed to download ${soundItem.name}`);
          }
        }
      } catch (error) {
        console.error(`🎯 [handleDownloadSound] Exception:`, error);
        showSnackbar(`Error downloading ${soundItem.name}`);
      } finally {
        console.log(`🎯 [handleDownloadSound] Removing from downloading state`);
        setDownloadingStates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });
      }
    },
    [downloadingStates, pro, showSnackbar],
  );

  // Fade in sound over duration
  const fadeInSound = useCallback(
    async (sound: any, targetVolume: number, duration: number = 1500) => {
      try {
        if (!sound) {
          console.warn("⚠️  fadeInSound: sound object is null/undefined");
          return;
        }

        const startVolume = 0;
        const startTime = Date.now();
        const steps = 30;
        const stepDuration = duration / steps;

        const fadeStep = (elapsed: number) => {
          if (elapsed >= duration) {
            sound.setVolumeAsync(targetVolume).catch((err: any) => {
              console.warn("⚠️  setVolumeAsync failed at end of fade:", err);
            });
            return;
          }

          const progress = elapsed / duration;
          const currentVolume =
            startVolume + (targetVolume - startVolume) * progress;
          sound.setVolumeAsync(currentVolume).catch((err: any) => {
            console.warn("⚠️  setVolumeAsync failed during fade:", err);
          });

          setTimeout(() => fadeStep(Date.now() - startTime), stepDuration);
        };

        fadeStep(0);
      } catch (error) {
        console.error("Error fading in sound:", error);
        if (sound) {
          sound.setVolumeAsync(targetVolume).catch((err: any) => {
            console.warn("⚠️  Fallback setVolumeAsync failed:", err);
          });
        }
      }
    },
    [],
  );

  // Fade out sound over duration
  const fadeOutSound = useCallback(
    async (sound: any, startVolume: number, duration: number = 1500) => {
      try {
        if (!sound) {
          console.warn("⚠️  fadeOutSound: sound object is null/undefined");
          return;
        }

        const startTime = Date.now();
        const steps = 30;
        const stepDuration = duration / steps;

        const fadeStep = (elapsed: number) => {
          if (elapsed >= duration) {
            sound.setVolumeAsync(0).catch((err: any) => {
              console.warn("⚠️  setVolumeAsync(0) failed at end of fade:", err);
            });
            return;
          }

          const progress = elapsed / duration;
          const currentVolume = startVolume * (1 - progress);
          sound.setVolumeAsync(currentVolume).catch((err: any) => {
            console.warn("⚠️  setVolumeAsync failed during fade out:", err);
          });

          setTimeout(() => fadeStep(Date.now() - startTime), stepDuration);
        };

        fadeStep(0);
      } catch (error) {
        console.error("Error fading out sound:", error);
        if (sound) {
          sound.setVolumeAsync(0).catch((err: any) => {
            console.warn("⚠️  Fallback setVolumeAsync(0) failed:", err);
          });
        }
      }
    },
    [],
  );

  // Helper function to clean up existing sounds without resetting state
  const cleanupExistingSounds = useCallback(async (): Promise<void> => {
    if (activeSounds.size === 0) {
      return;
    }

    const soundIds = Array.from(activeSounds.keys());
    console.log(`🧹 Cleaning up ${soundIds.length} existing sound(s)...`);

    const cleanupPromises: Promise<void>[] = [];

    for (const [id, data] of activeSounds.entries()) {
      if (data?.sound) {
        const cleanupSound = async () => {
          try {
            console.log(
              `  ⏹️  Cleaning up sound ${id} (${data.soundItem.name})...`,
            );

            // Clear playback status listener to prevent memory leaks
            try {
              data.sound.setOnPlaybackStatusUpdate(null);
            } catch (listenerError) {
              console.warn(
                `⚠️  Could not clear listener for sound ${id}:`,
                listenerError,
              );
            }

            // Stop the sound
            try {
              await data.sound.stopAsync();
            } catch (stopError) {
              console.warn(`⚠️  Stop failed for sound ${id}:`, stopError);
            }

            // Unload the sound
            try {
              await data.sound.unloadAsync();
            } catch (unloadError) {
              console.warn(`⚠️  Unload failed for sound ${id}:`, unloadError);
            }

            console.log(`  ✅ Sound ${id} cleaned up`);
          } catch (error) {
            console.error(`Error cleaning up sound ${id}:`, error);
          }
        };

        cleanupPromises.push(cleanupSound());
      }
    }

    await Promise.all(cleanupPromises);

    // Hide notification after cleanup
    try {
      await hidePlayingNotification();
    } catch (notifError) {
      console.log("📢 Notification dismiss skipped:", notifError);
    }

    console.log(`✅ All ${soundIds.length} sound(s) cleaned up`);
  }, [activeSounds]);

  // Helper function to load a new sound (returns sound object, doesn't play yet)
  const loadNewSound = useCallback(
    async (
      soundItem: any,
    ): Promise<{
      sound: Audio.Sound;
      soundItem: any;
      volume: number;
      isMuted: boolean;
      id: number;
    }> => {
      console.log(`📦 Loading sound ${soundItem.id} (${soundItem.name})...`);

      // Get source using sound cache - prioritize playback if not cached
      // Add timeout to prevent hanging in offline mode
      let source: any;
      try {
        const sourcePromise = soundCache.getSource(soundItem, true, true);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Source load timeout")), 5000),
        );
        source = await Promise.race([sourcePromise, timeoutPromise]);
      } catch (error) {
        console.warn(
          `⚠️ Failed to get sound source (likely offline): ${error}`,
        );
        // In offline mode, if no cached version available, can't play
        throw new Error(
          `Cannot load ${soundItem.name} - check your internet connection or download it for offline use`,
        );
      }

      // Register callback for when download completes (background caching)
      if (!soundCache.isDownloaded(soundItem.id)) {
        soundCache.onDownloadComplete(
          soundItem.id,
          (completedId: number, success: boolean) => {
            if (success) {
              setDownloadedSounds((prev) => {
                const newSet = new Set(prev);
                newSet.add(completedId);
                return newSet;
              });
              const sound = WHITE_NOISE_SOUNDS.find(
                (s) => s.id === completedId,
              );
              if (sound) {
                showSnackbar(`${sound.name} saved for offline`);
                safeAnalytics.trackSoundDownloaded(completedId, sound.name);
              }
            } else {
              const sound = WHITE_NOISE_SOUNDS.find(
                (s) => s.id === completedId,
              );
              if (sound) {
                showSnackbar(`Failed to save ${sound.name} for offline`);
              }
            }
          },
        );
      }

      // Update downloaded state if already cached
      if (soundCache.isDownloaded(soundItem.id)) {
        setDownloadedSounds((prev) => {
          const newSet = new Set(prev);
          newSet.add(soundItem.id);
          return newSet;
        });
      }

      // Create sound with timeout protection
      let newSound: Audio.Sound;
      try {
        const createPromise = Audio.Sound.createAsync(
          source,
          {
            isLooping: true,
            volume: 0, // Start at 0, we'll fade in after playback starts
            shouldPlay: false,
            progressUpdateIntervalMillis: 1000,
            androidImplementation: "MediaPlayer",
          },
          undefined, // No status callback during load - we'll set it after
          false, // Don't download entire file before playing
        );
        const timeoutPromise = new Promise<{ sound: Audio.Sound }>(
          (_, reject) =>
            setTimeout(() => reject(new Error("Sound creation timeout")), 8000),
        );
        const result = await Promise.race([createPromise, timeoutPromise]);
        newSound = result.sound;
      } catch (error) {
        console.error(`❌ Failed to create sound object: ${error}`);
        throw new Error(
          `Could not load ${soundItem.name}. Check internet connection or download for offline.`,
        );
      }

      console.log(`✅ Sound ${soundItem.id} (${soundItem.name}) loaded`);

      return {
        sound: newSound,
        soundItem,
        volume: 0.5,
        isMuted: globalMuted,
        id: soundItem.id,
      };
    },
    [globalMuted, showSnackbar],
  );

  // Check system volume and show warning if too low
  const checkVolumeAndWarn = useCallback(async () => {
    try {
      // Get the current sound (Audio module uses system volume)
      // We can't directly access system volume, so we'll use a heuristic
      // If user hasn't dismissed warning and sounds are about to play, show it
      if (!volumeWarningDismissed) {
        // Small chance to check - show warning to users who may have low volume
        // This is a non-intrusive reminder
        setShowVolumeWarning(true);

        // Auto-hide after 5 seconds if not dismissed
        const timer = setTimeout(() => {
          setShowVolumeWarning(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.log("Could not check volume:", error);
    }
  }, [volumeWarningDismissed]);

  // Main function to play a single sound (with parallel cleanup + load)
  const tryPlaySingle = async (soundItem: any) => {
    // Check volume warning first
    await checkVolumeAndWarn();

    // Check if sound is premium and user doesn't have pro
    console.log(`Trying to play: ${soundItem.name}`);
    console.log(`Is premium: ${soundItem.premium}`);
    console.log(`User has pro: ${pro}`);

    if (soundItem.premium && !pro) {
      console.log("Opening paywall for premium sound");
      safeAnalytics.trackPaywallViewed("premium_sound");
      setPaywallOpen(true);
      return;
    }

    console.log("Playing sound");

    // Track sound played
    safeAnalytics.trackSoundPlayed(
      soundItem.id,
      soundItem.name,
      soundItem.premium,
      "single",
    );

    // If this sound is already the only one playing, do nothing
    if (
      activeSounds.size === 1 &&
      activeSounds.has(soundItem.id) &&
      isPlaying
    ) {
      return;
    }

    // Immediate visual feedback - show selection border
    setSelectedSounds(new Set([soundItem.id]));
    setLoadingSounds((prev) => new Set(prev).add(soundItem.id));

    console.log(`🎵 Switching to sound ${soundItem.id} (${soundItem.name})...`);

    try {
      // Run cleanup and loading in parallel for faster switching
      const [, soundData] = await Promise.all([
        cleanupExistingSounds(),
        loadNewSound(soundItem),
      ]);

      // Clear loading state now that sound is loaded
      setLoadingSounds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(soundItem.id);
        return newSet;
      });

      // Start playback
      console.log(`⏯️  Starting playback for sound ${soundItem.id}...`);
      await soundData.sound.playAsync();

      // Fade in to target volume
      fadeInSound(
        soundData.sound,
        soundData.isMuted ? 0 : soundData.volume,
        500,
      );

      // ✅ Playback status tracking handled by usePlaybackStatusPolling hook
      // Removed setOnPlaybackStatusUpdate callback - unreliable on Android SDK 51+
      // The polling hook provides reliable cross-platform status updates

      // Update state atomically
      const newActiveSounds = new Map();
      newActiveSounds.set(soundItem.id, soundData);

      setActiveSounds(newActiveSounds);
      setIsPlaying(true);
      setSelectedSounds(new Set()); // Clear selection since now active

      console.log(`✅ Sound ${soundItem.id} (${soundItem.name}) now playing!`);

      // Show notification (non-blocking)
      showPlayingNotification(soundItem.name, false).catch((notifError) => {
        console.log("📢 Notification skipped:", notifError);
      });
    } catch (error) {
      // Clear loading and selected state on error
      setLoadingSounds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(soundItem.id);
        return newSet;
      });
      setSelectedSounds(new Set());

      Alert.alert("Error", "Could not play sound. Please try again later.");
      console.error("Error playing sound:", error);
    }
  };

  const pauseAllSounds = useCallback(async () => {
    for (const [, data] of activeSounds.entries()) {
      if (data?.sound) {
        try {
          await fadeOutSound(data.sound, data.volume, 1000);
          await data.sound.pauseAsync();
        } catch (error) {
          console.error("Error pausing sound:", error);
        }
      }
    }
    setIsPlaying(false);

    safeAnalytics.trackSoundPaused();

    if (activeSounds.size > 0) {
      const firstSound = Array.from(activeSounds.values())[0];
      if (firstSound?.soundItem?.name) {
        try {
          await showPlayingNotification(firstSound.soundItem.name, true);
        } catch (notifError) {
          console.log("📢 Notification skipped:", notifError);
        }
      }
    }
  }, [activeSounds, fadeOutSound]);

  const resumeAllSounds = useCallback(async () => {
    try {
      for (const [, data] of activeSounds.entries()) {
        if (data?.sound) {
          try {
            await data.sound.setVolumeAsync(0);
            await data.sound.playAsync();
            fadeInSound(data.sound, data.volume, 1000).catch((err) => {
              console.error("Error during fade in:", err);
            });
          } catch (error) {
            console.error("Error resuming sound:", error);
          }
        }
      }
      setIsPlaying(true);

      safeAnalytics.trackSoundResumed();

      if (activeSounds.size > 0) {
        const firstSound = Array.from(activeSounds.values())[0];
        if (firstSound?.soundItem?.name) {
          try {
            await showPlayingNotification(firstSound.soundItem.name, false);
          } catch (notifError) {
            console.log("📢 Notification skipped:", notifError);
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not resume sounds.");
      console.error("Error resuming sounds:", error);
    }
  }, [activeSounds, fadeInSound]);

  const stopAllSounds = useCallback(async () => {
    try {
      const soundCount = activeSounds.size;
      if (soundCount > 0) {
        const soundNames = Array.from(activeSounds.values())
          .map((d) => `${d.soundItem.id} (${d.soundItem.name})`)
          .join(", ");
        console.log(`🛑 Stopping ${soundCount} sound(s): ${soundNames}...`);
      }

      // Clear timer first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop and unload all sounds with proper cleanup
      for (const [id, data] of activeSounds.entries()) {
        if (data?.sound) {
          try {
            console.log(
              `  ⏹️  Stopping sound ${id} (${data.soundItem.name})...`,
            );

            try {
              data.sound.setOnPlaybackStatusUpdate(null);
            } catch (listenerError) {
              console.warn(
                `⚠️  Could not clear listener for sound ${id}:`,
                listenerError,
              );
            }

            try {
              await data.sound.stopAsync();
            } catch (stopError) {
              console.warn(`⚠️  Stop failed for sound ${id}:`, stopError);
            }

            try {
              await data.sound.unloadAsync();
            } catch (unloadError) {
              console.warn(`⚠️  Unload failed for sound ${id}:`, unloadError);
            }

            console.log(`  ✅ Sound ${id} cleaned up`);
          } catch (error) {
            console.error(`Error stopping sound ${id}:`, error);
          }
        }
      }

      // Reset all states
      setActiveSounds(new Map());
      setIsPlaying(false);
      setTimerMinutes(null);
      setTimerSeconds(0);
      setGlobalMuted(false);
      if (soundCount > 0) {
        console.log(`✅ All ${soundCount} sound(s) stopped and states reset`);
      }

      if (soundCount > 0) {
        safeAnalytics.trackAllSoundsStopped(soundCount);
      }

      try {
        await hidePlayingNotification();
      } catch (notifError) {
        console.log("📢 Notification dismiss skipped:", notifError);
      }
    } catch (error) {
      Alert.alert("Error", "Could not stop sounds.");
      console.error("Error stopping sounds:", error);
    }
  }, [activeSounds, hidePlayingNotification]);

  // Register stopAllSounds callback with context - use ref to avoid re-renders
  const stopAllSoundsRef = useRef(stopAllSounds);

  useEffect(() => {
    stopAllSoundsRef.current = stopAllSounds;
  }, [stopAllSounds]);

  useEffect(() => {
    const wrappedStopAll = async () => await stopAllSoundsRef.current();
    setStopMainSounds(wrappedStopAll);
    return () => {
      setStopMainSounds(null);
    };
  }, [setStopMainSounds]);

  // Create refs for notification actions to avoid stale closures
  const notificationPauseRef = useRef(pauseAllSounds);
  const notificationResumeRef = useRef(resumeAllSounds);

  useEffect(() => {
    notificationPauseRef.current = pauseAllSounds;
    notificationResumeRef.current = resumeAllSounds;
  }, [pauseAllSounds, resumeAllSounds]);

  // Setup notification listener
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const action = response.actionIdentifier;
        console.log("📢 Notification action:", action);

        switch (action) {
          case NOTIFICATION_ACTIONS.PAUSE:
            await notificationPauseRef.current();
            break;
          case NOTIFICATION_ACTIONS.PLAY:
            await notificationResumeRef.current();
            break;
          case NOTIFICATION_ACTIONS.STOP:
            await stopAllSoundsRef.current();
            break;
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleSetTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      safeAnalytics.trackTimerCleared();
    } else {
      safeAnalytics.trackTimerSet(minutes);
    }
    setTimerMinutes(minutes);
    setTimerSeconds(minutes ? minutes * 60 : 0);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Memoized SoundCard to prevent unnecessary re-renders
  const SoundCard = React.memo(
    ({ soundItem, index }: { soundItem: any; index: number }) => {
      const isActive = activeSounds.has(soundItem.id);
      const isQuickPlayActive =
        isQuickPlaying && favoriteSoundId === String(soundItem.id);
      const isLoading = loadingSounds.has(soundItem.id);
      const isSelected = selectedSounds.has(soundItem.id);
      const isDownloading = downloadingStates.has(soundItem.id);
      const isDownloaded = downloadedSounds.has(soundItem.id);

      const cardScale = useRef(new Animated.Value(1)).current;
      const heartScale = useRef(new Animated.Value(1)).current;
      const iconPulse = useRef(new Animated.Value(1)).current;

      useEffect(() => {
        if (isActive || isQuickPlayActive) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconPulse, {
                toValue: 1.15,
                duration: 800,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(iconPulse, {
                toValue: 1,
                duration: 800,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ).start();
        } else {
          iconPulse.stopAnimation();
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      }, [isActive, isQuickPlayActive, iconPulse]);

      const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.sequence([
          Animated.timing(cardScale, {
            toValue: 0.97,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        tryPlaySingle(soundItem);
      };

      const handleHeartPress = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.sequence([
          Animated.spring(heartScale, {
            toValue: 1.3,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(heartScale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        toggleFavorite(soundItem.id);
      };

      return (
        <Animated.View
          style={{
            transform: [{ scale: cardScale }],
          }}
        >
          <TouchableOpacity
            style={[
              styles.soundCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              (isActive || isQuickPlayActive || isSelected) && {
                borderColor: theme.primary,
                backgroundColor: theme.card,
                borderWidth: 2.5,
              },
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: soundItem.color,
                  transform: [{ scale: iconPulse }],
                },
              ]}
            >
              {isLoading ? (
                <View style={{ position: "relative" }}>
                  <ActivityIndicator size="small" color="white" />
                  <View
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      backgroundColor: soundItem.color,
                      borderRadius: 8,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 8,
                        fontWeight: "600",
                      }}
                    >
                      ...
                    </Text>
                  </View>
                </View>
              ) : (
                <Ionicons name={soundItem.icon} size={24} color="white" />
              )}
            </Animated.View>

            <View style={styles.soundInfo}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={[
                    styles.soundName,
                    { color: theme.text, fontSize: getScaledFontSize(18) },
                  ]}
                >
                  {soundItem.name}
                </Text>
                {favoriteSoundId === String(soundItem.id) && (
                  <View
                    style={{
                      backgroundColor: "#ff6b6b",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 9,
                        fontWeight: "700",
                        letterSpacing: 0.3,
                      }}
                    >
                      QUICK PLAY
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.soundDescription,
                  {
                    color: theme.textSecondary,
                    fontSize: getScaledFontSize(14),
                    opacity: 0.95,
                  },
                ]}
              >
                {soundItem.description}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {!soundItem.isLocal &&
                !isDownloaded &&
                (pro || !soundItem.premium) && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleDownloadSound(soundItem);
                    }}
                    style={{
                      padding: 8,
                      position: "relative",
                    }}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name="cloud-download-outline"
                        size={20}
                        color={theme.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}

              {soundItem.premium && !pro ? (
                <View
                  style={{
                    backgroundColor: "#8b5cf6",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 0.5,
                    }}
                  >
                    PRO
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleHeartPress}
                  style={{
                    padding: 8,
                  }}
                >
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons
                      name={
                        favorites?.has(soundItem.id) ? "heart" : "heart-outline"
                      }
                      size={22}
                      color={
                        favorites?.has(soundItem.id)
                          ? "#FF6B6B"
                          : theme.textSecondary
                      }
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
  );
  SoundCard.displayName = "SoundCard";

  // Memoize filtered sounds to prevent double filtering
  const filteredSounds = React.useMemo(() => {
    return WHITE_NOISE_SOUNDS.filter((sound) => {
      if (selectedCategory === "Favourites") {
        return favorites?.has(sound.id) || false;
      }
      if (selectedCategory === "Downloaded") {
        return sound.isLocal || downloadedSounds.has(sound.id);
      }
      return (
        selectedCategory === SOUND_CATEGORIES.ALL ||
        sound.category === selectedCategory
      );
    });
  }, [selectedCategory, favorites, downloadedSounds]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* Pro Upgrade Banner - only show if not pro and not dismissed */}
      {!pro && !proBannerDismissed && (
        <TouchableOpacity
          style={[
            styles.proBanner,
            {
              backgroundColor: "#8b5cf6",
            },
          ]}
          activeOpacity={0.8}
          onPress={() => setPaywallOpen(true)}
        >
          <View style={styles.proBannerContent}>
            <View style={styles.proBannerIcon}>
              <Ionicons name="star" size={18} color="#FFD700" />
            </View>
            <View style={styles.proBannerText}>
              <Text style={styles.proBannerTitle}>Upgrade to Pro</Text>
              <Text style={styles.proBannerSubtitle}>
                Unlock 44 premium sounds
              </Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setProBannerDismissed(true);
              }}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Pro Badge - shown when user has pro subscription */}
      {pro && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
            paddingHorizontal: 16,
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 4,
            backgroundColor: "rgba(255, 215, 0, 0.15)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255, 215, 0, 0.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFD700",
              borderRadius: 8,
              padding: 4,
              marginRight: 8,
            }}
          >
            <Ionicons name="star" size={16} color="#0A0903" />
          </View>
          <Text
            style={{
              color: "#FFD700",
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            PRO MEMBER
          </Text>
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: "rgba(255, 215, 0, 0.2)",
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                color: "#FFD700",
                fontSize: 10,
                fontWeight: "600",
              }}
            >
              ALL SOUNDS UNLOCKED
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryTabs, { paddingTop: pro ? 4 : 6 }]}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Show Favourites category first if there are any favorites */}
        {favorites && favorites.size > 0 && (
          <TouchableOpacity
            key="Favourites"
            style={[
              styles.categoryTab,
              {
                backgroundColor:
                  selectedCategory === "Favourites"
                    ? theme.primary
                    : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              safeAnalytics.trackCategorySelected("Favourites", favorites.size);
              setSelectedCategory("Favourites");
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                {
                  color:
                    selectedCategory === "Favourites" ? "white" : theme.text,
                  fontWeight: selectedCategory === "Favourites" ? "700" : "600",
                },
              ]}
            >
              Favourites
            </Text>
            {selectedCategory === "Favourites" && (
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  left: 8,
                  right: 8,
                  height: 3,
                  backgroundColor: "white",
                  borderRadius: 2,
                }}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Show Downloaded category if there are any downloaded sounds */}
        {downloadedSounds && downloadedSounds.size > 0 && (
          <TouchableOpacity
            key="Downloaded"
            style={[
              styles.categoryTab,
              {
                backgroundColor:
                  selectedCategory === "Downloaded" ? "#10b981" : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              safeAnalytics.trackCategorySelected(
                "Downloaded",
                downloadedSounds.size,
              );
              setSelectedCategory("Downloaded");
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                {
                  color:
                    selectedCategory === "Downloaded" ? "white" : theme.text,
                  fontWeight: selectedCategory === "Downloaded" ? "700" : "600",
                },
              ]}
            >
              Offline
            </Text>
            {selectedCategory === "Downloaded" && (
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  left: 8,
                  right: 8,
                  height: 3,
                  backgroundColor: "white",
                  borderRadius: 2,
                }}
              />
            )}
          </TouchableOpacity>
        )}
        {Object.values(SOUND_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              {
                backgroundColor:
                  selectedCategory === category
                    ? CATEGORY_COLORS[category]
                    : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              safeAnalytics.trackCategorySelected(
                category,
                WHITE_NOISE_SOUNDS.filter(
                  (s) =>
                    selectedCategory === SOUND_CATEGORIES.ALL ||
                    s.category === category,
                ).length,
              );
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                {
                  color: selectedCategory === category ? "white" : theme.text,
                  fontWeight: selectedCategory === category ? "700" : "600",
                },
              ]}
            >
              {category}
            </Text>
            {selectedCategory === category && (
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  left: 8,
                  right: 8,
                  height: 3,
                  backgroundColor: "white",
                  borderRadius: 2,
                }}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.soundsList}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          ref={(ref) => {
            scrollViewRef.current = ref;
            setScrollViewRef("index", ref);
          }}
        >
          {isInitialLoad ? (
            <>
              <SoundCardSkeleton />
              <SoundCardSkeleton />
              <SoundCardSkeleton />
              <SoundCardSkeleton />
              <SoundCardSkeleton />
              <SoundCardSkeleton />
            </>
          ) : (
            <>
              {filteredSounds.length === 0 ? (
                <EmptyPlayerState theme={theme} />
              ) : (
                filteredSounds.map((soundItem, index) => (
                  <SoundCard
                    key={soundItem.id}
                    soundItem={soundItem}
                    index={index}
                  />
                ))
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      {(activeSounds.size > 0 || selectedSounds.size > 0) && (
        <>
          <Animated.View
            style={[
              styles.playerControls,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                transform: [{ translateY: playerSlide }],
              },
            ]}
          >
            {/* Timer display */}
            {timerMinutes !== null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="timer-outline"
                  size={14}
                  color={theme.primary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.primary,
                    fontWeight: "600",
                  }}
                >
                  {formatTime(timerSeconds)}
                </Text>
              </View>
            )}

            {/* Sound info and controls layout */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              {/* Sound info on the left */}
              {(activeSounds.size > 0 || selectedSounds.size > 0) && (
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Colored circle with icon and loading spinner */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor:
                        activeSounds.size > 0
                          ? Array.from(activeSounds.values())[0]?.soundItem
                              ?.color
                          : WHITE_NOISE_SOUNDS.find(
                              (s) => s.id === Array.from(selectedSounds)[0],
                            )?.color,
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    {activeSounds.size > 0 &&
                    !loadingSounds.has(
                      Array.from(activeSounds.values())[0]?.soundItem?.id,
                    ) ? (
                      <Ionicons
                        name={
                          Array.from(activeSounds.values())[0]?.soundItem
                            ?.icon || "musical-notes"
                        }
                        size={22}
                        color="white"
                      />
                    ) : selectedSounds.size > 0 ? (
                      <ActivityIndicator
                        size="small"
                        color="white"
                        style={{ position: "absolute" }}
                      />
                    ) : (
                      <Ionicons name="musical-notes" size={22} color="white" />
                    )}
                  </View>

                  {/* Sound name and count */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 2,
                      }}
                    >
                      {activeSounds.size > 0
                        ? Array.from(activeSounds.values())[0]?.soundItem?.name
                        : selectedSounds.size > 0
                          ? WHITE_NOISE_SOUNDS.find(
                              (s) => s.id === Array.from(selectedSounds)[0],
                            )?.name
                          : "No sound"}
                    </Text>
                    {activeSounds.size > 1 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        {Array.from(activeSounds.values())
                          .slice(1)
                          .map((data, idx) => (
                            <View
                              key={data.soundItem.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                backgroundColor: data.soundItem.color,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                              }}
                            >
                              <Ionicons
                                name={
                                  data.soundItem.icon as React.ComponentProps<
                                    typeof Ionicons
                                  >["name"]
                                }
                                size={12}
                                color="white"
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "white",
                                  fontWeight: "600",
                                }}
                                numberOfLines={1}
                              >
                                {data.soundItem.name}
                              </Text>
                            </View>
                          ))}
                      </View>
                    )}
                    {activeSounds.size === 0 && selectedSounds.size > 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.primary,
                          fontWeight: "500",
                        }}
                      >
                        Loading...
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Control buttons on the right */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <AnimatedControlButton
                  onPress={() => {
                    if (!pro) {
                      setPaywallOpen(true);
                    } else {
                      setMixerModalVisible(true);
                    }
                  }}
                  iconName="options"
                  size={20}
                  style={{
                    backgroundColor:
                      activeSounds.size > 1 ? theme.primary : theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    width: 40,
                    height: 40,
                  }}
                  iconColor={activeSounds.size > 1 ? "white" : theme.text}
                />
                <AnimatedControlButton
                  onPress={() => setTimerModalVisible(true)}
                  iconName="timer"
                  size={20}
                  style={{
                    backgroundColor: timerMinutes ? theme.primary : theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    width: 40,
                    height: 40,
                  }}
                  iconColor={timerMinutes ? "white" : theme.text}
                />
                <AnimatedControlButton
                  onPress={
                    selectedSounds.size > 0 && activeSounds.size === 0
                      ? undefined
                      : isPlaying
                        ? pauseAllSounds
                        : resumeAllSounds
                  }
                  iconName={
                    selectedSounds.size > 0 && activeSounds.size === 0
                      ? "hourglass"
                      : isPlaying
                        ? "pause"
                        : "play"
                  }
                  size={20}
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: theme.primary,
                    opacity:
                      selectedSounds.size > 0 && activeSounds.size === 0
                        ? 0.6
                        : 1,
                  }}
                  iconColor="white"
                />
                <AnimatedControlButton
                  onPress={stopAllSounds}
                  iconName="stop"
                  size={20}
                  style={{
                    backgroundColor: theme.error,
                    width: 40,
                    height: 40,
                  }}
                  iconColor="white"
                />
              </View>
            </View>
          </Animated.View>
        </>
      )}
      {/* Mixer Modal */}
      <MixerModal
        visible={mixerModalVisible}
        onClose={() => {
          setMixerModalVisible(false);
        }}
        theme={theme}
        activeSounds={activeSounds}
        onToggleSound={toggleSoundInMixer}
        onVolumeChange={changeSoundVolume}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        pro={pro}
        isPlaying={isPlaying}
      />
      {/* Timer Modal */}
      <TimerModal
        visible={timerModalVisible}
        onClose={() => {
          setTimerModalVisible(false);
        }}
        onSetTimer={handleSetTimer}
        theme={theme}
        currentTimer={timerMinutes}
      />

      {/* Snackbar for favorites feedback */}
      {snackbars.map((snackbar, index) => (
        <Animated.View
          key={snackbar.id}
          style={{
            position: "absolute",
            top: 120,
            left: 20,
            right: 20,
            backgroundColor: theme.surface,
            padding: 14,
            borderRadius: 12,
            opacity: snackbar.opacity,
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 6,
            zIndex: 9999 - index,
            transform: [{ translateY: snackbar.translateY }],
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {snackbar.message}
          </Text>
        </Animated.View>
      ))}

      {/* Volume Warning Banner */}
      {showVolumeWarning && !volumeWarningDismissed && (
        <View
          style={{
            position: "absolute",
            top: 20,
            left: 16,
            right: 16,
            backgroundColor: "#f59e0b",
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 1000,
          }}
        >
          <Ionicons name="volume-mute" size={20} color="white" />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "white",
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 2,
              }}
            >
              Volume Low
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              Turn up your device volume to hear the sounds
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowVolumeWarning(false);
              setVolumeWarningDismissed(true);
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
    </View>
  );
}

function AnimatedControlButton({
  onPress,
  iconName,
  style = {},
  iconColor,
  size = 24,
}: any) {
  const { theme } = useTheme();
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!onPress) return;
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
      <TouchableOpacity
        style={[
          styles.controlButton,
          { backgroundColor: theme.primary },
          style,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <Ionicons name={iconName} size={size} color={iconColor || "white"} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  proBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  proBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  proBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  proBannerText: {
    flex: 1,
  },
  proBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
  },
  proBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  header: {
    padding: 10,
    alignItems: "center",
    height: 65,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  categoryTabs: {
    paddingBottom: 6,
    maxHeight: 50,
  },
  image: {
    width: 300,
    height: 75,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  backgroundPlayIndicator: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  soundsList: { flex: 1, padding: 10 },
  soundCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  soundInfo: { flex: 1 },
  soundName: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  soundDescription: { fontSize: 14 },
  playingIndicator: { padding: 8 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  overlayTouchable: { flex: 1 },
  playerControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 80,
    borderTopWidth: 1,
    elevation: 8,
    zIndex: 2,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
  },
  nowPlaying: { alignItems: "center", marginBottom: 16 },
  nowPlayingText: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  currentSoundName: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  backgroundPlayText: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  controlButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    elevation: 5,
  },
  volumeControl: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  volumeSlider: { flex: 1, marginHorizontal: 12 },
  volumeTrack: { height: 4, borderRadius: 2, position: "relative" },
  volumeThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: "absolute",
    top: -6,
    marginLeft: -8,
    elevation: 4,
  },
  timerDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(100, 100, 255, 0.1)",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  playingText: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
});
