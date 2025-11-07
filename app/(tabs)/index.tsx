import { PaywallModal } from "@/components/PaywallModal";
import {
  CATEGORY_COLORS,
  SOUND_CATEGORIES,
  SoundCategory,
  WHITE_NOISE_SOUNDS,
} from "@/constants/sound";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

import { useQuickPlay } from "@/contexts/quickplay";
import { useRevenueCat } from "@/contexts/revenuecat";
import { useScroll } from "@/contexts/scroll";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Modal,
  PanResponder,
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
import { useTheme } from "../../contexts/themecontext";
import {
  hidePlayingNotification,
  setupAudioNotifications,
  showPlayingNotification,
} from "../../utils/audioNotification";

/* ---------- Platform helpers ---------- */
const isWeb = Platform.OS === "web";
const isAndroid = Platform.OS === "android";

/* ---------- Storage (web-safe) ---------- */
const ENTITLEMENT_KEY = "entitlement_pro";
const FAVORITES_KEY = "favorite_sound_ids";

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

/* ---------- Downloaded Sounds Tracker ---------- */
const DownloadedSounds = {
  downloaded: new Set<number>(),

  markAsDownloaded(soundId: number) {
    this.downloaded.add(soundId);
  },

  isDownloaded(soundId: number): boolean {
    return this.downloaded.has(soundId);
  },
};

/* ---------- Sound Source Helper ---------- */
const SoundCache = {
  getSource(soundItem: any, onFirstLoad?: () => void) {
    // For local sounds, return the required asset directly
    if (soundItem.isLocal) {
      return soundItem.source;
    }

    // For remote sounds, mark as downloaded after first successful load (non-blocking)
    if (!DownloadedSounds.isDownloaded(soundItem.id)) {
      // Mark as downloaded in background without blocking
      setTimeout(() => {
        DownloadedSounds.markAsDownloaded(soundItem.id);
        onFirstLoad?.();
      }, 100);
    }

    // Return immediately without waiting
    return { uri: soundItem.source };
  },

  isDownloaded(soundId: number): boolean {
    return DownloadedSounds.isDownloaded(soundId);
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
  const [localVolumes, setLocalVolumes] = useState<Map<number, number>>(
    new Map()
  );

  useEffect(() => {
    const volumes = new Map<number, number>();
    activeSounds.forEach((data, id) => {
      volumes.set(id, data.volume);
    });
    setLocalVolumes(volumes);
  }, [activeSounds]);

  const handleVolumeChange = (soundId: number, value: number) => {
    const newVolumes = new Map(localVolumes);
    newVolumes.set(soundId, value);
    setLocalVolumes(newVolumes);
    onVolumeChange(soundId, value);
  };

  // Volume Slider Component with PanResponder
  const VolumeSlider = ({
    soundId,
    soundItem,
    volume,
  }: {
    soundId: number;
    soundItem: any;
    volume: number;
  }) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleSliderPress = (evt: any) => {
      if (sliderWidth > 0) {
        const locationX = evt.nativeEvent.locationX;
        const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
        handleVolumeChange(soundId, newValue);
      }
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
        },
        onPanResponderMove: (evt, gestureState) => {
          if (sliderWidth > 0) {
            const locationX = evt.nativeEvent.locationX;
            const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
            handleVolumeChange(soundId, newValue);
          }
        },
        onPanResponderRelease: () => {
          setIsDragging(false);
        },
      })
    ).current;

    return (
      <View
        style={{ flexDirection: "row", alignItems: "center", paddingLeft: 52 }}
      >
        <Ionicons name="volume-low" size={16} color={theme.textSecondary} />
        <View
          style={{ flex: 1, marginHorizontal: 8 }}
          onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleSliderPress}
            style={{
              height: 32,
              justifyContent: "center",
            }}
            {...panResponder.panHandlers}
          >
            <View
              style={{
                height: 4,
                backgroundColor: theme.border,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${volume * 100}%`,
                  height: "100%",
                  backgroundColor: soundItem.color,
                }}
              />
            </View>
            <View
              style={{
                position: "absolute",
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "white",
                borderWidth: 3,
                borderColor: soundItem.color,
                left: `${volume * 100}%`,
                marginLeft: -12,
                elevation: isDragging ? 5 : 3,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: isDragging ? 4 : 2,
                transform: [{ scale: isDragging ? 1.2 : 1 }],
              }}
            />
          </TouchableOpacity>
        </View>
        <Ionicons name="volume-high" size={16} color={theme.textSecondary} />
        <Text
          style={{
            marginLeft: 8,
            color: theme.textSecondary,
            fontSize: 12,
            width: 35,
            textAlign: "right",
          }}
        >
          {Math.round(volume * 100)}%
        </Text>
      </View>
    );
  };

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

          <ScrollView showsVerticalScrollIndicator={false}>
            {WHITE_NOISE_SOUNDS.map((soundItem) => {
              const isActive = activeSounds.has(soundItem.id);
              const soundData = activeSounds.get(soundItem.id);
              const volume = localVolumes.get(soundItem.id) || 0.5;
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
                            Haptics.ImpactFeedbackStyle.Light
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

          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 12,
              alignItems: "center",
              marginTop: 16,
              backgroundColor: theme.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Sound Options Modal ---------- */
function SoundOptionsModal({
  visible,
  onClose,
  theme,
  sound,
  onPlay,
  onMixerPress,
  onTimerPress,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
  sound: any;
  onPlay: () => void;
  onMixerPress: () => void;
  onTimerPress: () => void;
}) {
  if (!sound) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
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
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: sound.color,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name={sound.icon} size={20} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 20, fontWeight: "600", color: theme.text }}
              >
                {sound.name}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginTop: 2,
                }}
              >
                {sound.description}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              onPlay();
              onClose();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              backgroundColor: theme.primary,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text style={{ color: "white", marginLeft: 12, fontWeight: "600" }}>
              Play Sound
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              onMixerPress();
              onClose();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              backgroundColor: theme.card,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons name="options" size={20} color={theme.text} />
            <Text
              style={{
                color: theme.text,
                marginLeft: 12,
                fontWeight: "600",
              }}
            >
              Mix with Other Sounds
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              onTimerPress();
              onClose();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              backgroundColor: theme.card,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons name="timer" size={20} color={theme.text} />
            <Text
              style={{
                color: theme.text,
                marginLeft: 12,
                fontWeight: "600",
              }}
            >
              Set Timer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 16,
              alignItems: "center",
              backgroundColor: theme.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "500" }}>Cancel</Text>
          </TouchableOpacity>
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
    }, 300); // Wait for slide animation
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
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.border,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
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

          <TouchableOpacity
            onPress={handleClose}
            style={{
              padding: 12,
              alignItems: "center",
              marginTop: 16,
              backgroundColor: theme.border,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ================== SOUND VISUALIZER ================== */
function SoundVisualizer({
  isPlaying,
  activeSoundsCount,
}: {
  isPlaying: boolean;
  activeSoundsCount: number;
}) {
  const { theme } = useTheme();
  const bars = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isPlaying && activeSoundsCount > 0) {
      const animations = bars.map((bar, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: Math.random() * 0.5 + 0.2,
              duration: 300 + Math.random() * 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      });

      animations.forEach((anim) => anim.start());

      return () => {
        animations.forEach((anim) => anim.stop());
      };
    } else {
      bars.forEach((bar) => {
        Animated.timing(bar, {
          toValue: 0.1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isPlaying, activeSoundsCount, bars]);

  return (
    <View
      style={{
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingHorizontal: 20,
        marginBottom: 12,
      }}
    >
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={{
            width: 3,
            height: "100%",
            backgroundColor: theme.primary,
            borderRadius: 2,
            opacity: 0.7,
            transform: [
              {
                scaleY: bar,
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ================== YOUR SCREEN (with gate) ================== */
export default function SoundsScreen() {
  const { theme, themeMode } = useTheme();
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

  const [focusKey, setFocusKey] = useState(0);

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
    SoundCategory | "Favourites"
  >(SOUND_CATEGORIES.ALL);

  const [isPlaying, setIsPlaying] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [mixerModalVisible, setMixerModalVisible] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // RevenueCat - check if user has Pro access
  const { isPro: pro } = useRevenueCat();

  // Paywall state
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Downloaded sounds state - local sounds (0: white noise, 1: rain, 2: ocean) are pre-downloaded
  const [downloadedSounds, setDownloadedSounds] = useState<Set<number>>(
    new Set([0, 1, 2])
  );

  // Snackbar state for favorites and download feedback
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const snackbarOpacity = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    configureAudioSession();

    // Setup notifications for background playback
    setupAudioNotifications();
  }, [backgroundPlayEnabled]);

  // Handle app state changes (safe on web)
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
      handleAppStateChange
    );
    return () => subscription?.remove();
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
            // Timer finished - stop all sounds
            setTimeout(() => {
              stopAllSounds();
            }, 0);
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
  }, [timerMinutes, isPlaying]);

  // Sync main playing state to context for quick play button
  useEffect(() => {
    setIsMainPlaying(isPlaying);
  }, [isPlaying, setIsMainPlaying]);

  const configureAudioSession = async () => {
    try {
      // On web, setAudioModeAsync is a no-op; guard just in case
      if (Audio?.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: backgroundPlayEnabled && !isWeb,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error("Error configuring audio session:", error);
    }
  };

  const updateNowPlayingInfo = async () => {
    try {
      if (!isWeb && activeSounds.size > 0) {
        const soundNames = Array.from(activeSounds.values())
          .map((data) => {
            const sound = WHITE_NOISE_SOUNDS.find((s) => s.id === data.id);
            return sound?.name || "Unknown";
          })
          .join(", ");

        // This would require expo-av's Audio.setNowPlayingInfo (if available)
        // Since expo-av is being deprecated, this is a placeholder for future implementation
        // with expo-audio or react-native-track-player
        console.log("Now Playing:", soundNames);
      }
    } catch (error) {
      console.error("Error updating now playing info:", error);
    }
  };

  const refreshSoundState = async () => {
    const newActiveSounds = new Map(activeSounds);
    let hasPlaying = false;

    for (const [id, data] of activeSounds.entries()) {
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
  };

  // Handle global mute/unmute
  const toggleGlobalMute = async () => {
    const newMuted = !globalMuted;
    setGlobalMuted(newMuted);

    const newActiveSounds = new Map(activeSounds);
    for (const [id, data] of newActiveSounds.entries()) {
      try {
        await data.sound.setVolumeAsync(newMuted ? 0 : data.volume);
        data.isMuted = newMuted;
      } catch (error) {
        console.error("Error toggling mute:", error);
      }
    }
    setActiveSounds(newActiveSounds);
  };

  useEffect(() => {
    // No animations - just cleanup
    return () => {
      // Cleanup all sounds on unmount
      activeSounds.forEach((data) => {
        data.sound.unloadAsync();
      });
    };
  }, []);

  // Update lock screen info when active sounds change
  useEffect(() => {
    updateNowPlayingInfo();
  }, [activeSounds, isPlaying]);

  useEffect(() => {
    if (activeSounds.size > 0) {
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
  }, [activeSounds.size, playerSlide, overlayOpacity]);

  // Load favorites from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await Storage.getItem(FAVORITES_KEY);
        if (stored) {
          const ids = JSON.parse(stored);
          setFavorites(new Set(ids));
        }
      } catch (error) {
        console.error("Error loading favorites:", error);
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
            setFavorites(new Set(ids));
          } else {
            setFavorites(new Set());
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      };
      loadFavorites();
    }, [])
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
    // Check if sound is premium
    const sound = WHITE_NOISE_SOUNDS.find((s) => s.id === soundId);
    const isPremium = sound?.premium || false;

    // Only require pro for premium sounds
    if (isPremium && !pro) {
      setPaywallOpen(true);
      return;
    }

    const newFavorites = new Set(favorites);
    if (newFavorites.has(soundId)) {
      newFavorites.delete(soundId);
      showSnackbar("Removed from favorites");

      // If we're viewing Favourites and this was the last one, switch to All
      if (selectedCategory === "Favourites" && newFavorites.size === 0) {
        setSelectedCategory(SOUND_CATEGORIES.ALL);
      }
    } else {
      newFavorites.add(soundId);
      showSnackbar("Added to favorites");
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  // Show snackbar animation
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    Animated.sequence([
      Animated.timing(snackbarOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(snackbarOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setSnackbarMessage(""));
  };

  // Toggle sound in mixer
  const toggleSoundInMixer = async (soundItem: any) => {
    const newActiveSounds = new Map(activeSounds);

    if (newActiveSounds.has(soundItem.id)) {
      // Remove sound
      const data = newActiveSounds.get(soundItem.id);
      if (data) {
        await data.sound.stopAsync();
        await data.sound.unloadAsync();
      }
      newActiveSounds.delete(soundItem.id);
    } else {
      // Add sound
      try {
        // Configure audio session non-blocking
        configureAudioSession();

        // Get source with download callback (instant, non-blocking)
        const source = SoundCache.getSource(soundItem, () => {
          // Mark as downloaded and show toast
          setDownloadedSounds((prev) => {
            const newSet = new Set(prev);
            newSet.add(soundItem.id);
            return newSet;
          });
          showSnackbar(`${soundItem.name} saved for offline`);
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          source,
          {
            isLooping: true,
            volume: globalMuted ? 0 : 0.5,
            shouldPlay: isPlaying,
            progressUpdateIntervalMillis: 500,
          },
          null,
          false // Don't download entire file before playing
        );

        newActiveSounds.set(soundItem.id, {
          sound: newSound,
          soundItem,
          volume: 0.5,
          isMuted: globalMuted,
          id: 0,
        });
      } catch (error) {
        Alert.alert(
          "Error",
          "Could not load sound. Please check your internet connection."
        );
        console.error("Error playing sound:", error);
      }
    }

    setActiveSounds(newActiveSounds);
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

    if (data) {
      data.volume = volume;
      if (!data.isMuted && !globalMuted) {
        await data.sound.setVolumeAsync(volume);
      }
      setActiveSounds(newActiveSounds);
    }
  };

  // Play single sound (from main list)
  const tryPlaySingle = async (soundItem: any) => {
    // Check if sound is premium and user doesn't have pro
    console.log(`Trying to play: ${soundItem.name}`);
    console.log(`Is premium: ${soundItem.premium}`);
    console.log(`User has pro: ${pro}`);

    if (soundItem.premium && !pro) {
      console.log("Opening paywall for premium sound");
      setPaywallOpen(true);
      return;
    }

    console.log("Playing sound");

    // If this sound is already the only one playing, do nothing
    if (
      activeSounds.size === 1 &&
      activeSounds.has(soundItem.id) &&
      isPlaying
    ) {
      return;
    }

    // Stop all other sounds and play just this one
    await stopAllSounds();
    await playSingleSound(soundItem);
  };

  const playSingleSound = async (soundItem: any) => {
    try {
      // Configure audio session non-blocking
      configureAudioSession();

      // Get source with download callback (instant, non-blocking)
      const source = SoundCache.getSource(soundItem, () => {
        // Mark as downloaded and show toast
        setDownloadedSounds((prev) => {
          const newSet = new Set(prev);
          newSet.add(soundItem.id);
          return newSet;
        });
        showSnackbar(`${soundItem.name} saved for offline`);
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        source,
        {
          isLooping: true,
          volume: globalMuted ? 0 : 0.5,
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        null,
        false // Don't download entire file before playing
      );

      newSound.setOnPlaybackStatusUpdate((status) => {
        if ((status as any).isLoaded) {
          setIsPlaying((status as any).isPlaying);
        }
      });

      const newActiveSounds = new Map();
      newActiveSounds.set(soundItem.id, {
        sound: newSound,
        soundItem,
        volume: 0.5,
        isMuted: globalMuted,
      });

      setActiveSounds(newActiveSounds);
      setIsPlaying(true);

      // Show notification for background playback
      await showPlayingNotification(soundItem.name);
    } catch (error) {
      Alert.alert("Error", "Could not play sound. Please try again later.");
      console.error("Error playing sound:", error);
    }
  };

  const pauseAllSounds = async () => {
    for (const [id, data] of activeSounds.entries()) {
      await data.sound.pauseAsync();
    }
    setIsPlaying(false);

    // Hide notification when paused
    await hidePlayingNotification();
  };

  const resumeAllSounds = async () => {
    try {
      for (const [id, data] of activeSounds.entries()) {
        await data.sound.playAsync();
      }
      setIsPlaying(true);

      // Show notification again when resumed
      if (activeSounds.size > 0) {
        const firstSound = Array.from(activeSounds.values())[0];
        if (firstSound?.soundItem?.name) {
          await showPlayingNotification(firstSound.soundItem.name);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not resume sounds.");
      console.error("Error resuming sounds:", error);
    }
  };

  const stopAllSounds = useCallback(async () => {
    try {
      // Clear timer first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop and unload all sounds
      for (const [id, data] of activeSounds.entries()) {
        try {
          await data.sound.stopAsync();
          await data.sound.unloadAsync();
        } catch (error) {
          console.error(`Error stopping sound ${id}:`, error);
        }
      }

      // Reset all states
      setActiveSounds(new Map());
      setIsPlaying(false);
      setTimerMinutes(null);
      setTimerSeconds(0);
      setGlobalMuted(false);

      // Hide notification when stopped
      await hidePlayingNotification();
    } catch (error) {
      Alert.alert("Error", "Could not stop sounds.");
      console.error("Error stopping sounds:", error);
    }
  }, [activeSounds]);

  // Register stopAllSounds callback with context - use ref to avoid re-renders
  const stopAllSoundsRef = useRef(stopAllSounds);

  useEffect(() => {
    stopAllSoundsRef.current = stopAllSounds;
  }, [stopAllSounds]);

  useEffect(() => {
    const wrappedStopAll = () => stopAllSoundsRef.current();
    setStopMainSounds(wrappedStopAll);
    return () => {
      setStopMainSounds(null);
    };
  }, [setStopMainSounds]);

  const handleOverlayPress = () => {
    handleClosePlayer();
  };

  const handleSetTimer = (minutes: number | null) => {
    setTimerMinutes(minutes);
    setTimerSeconds(minutes ? minutes * 60 : 0);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Get display name for current sounds
  const getCurrentSoundsDisplay = () => {
    const names = Array.from(activeSounds.values()).map(
      (data) => data.soundItem.name
    );
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(" & ");
    return `${names[0]} + ${names.length - 1} more`;
  };

  function SoundCard({ soundItem, index }: { soundItem: any; index: number }) {
    const isActive = activeSounds.has(soundItem.id);
    const isQuickPlayActive =
      isQuickPlaying && favoriteSoundId === String(soundItem.id);

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Gate playback
      tryPlaySingle(soundItem);
    };

    return (
      <View>
        <TouchableOpacity
          style={[
            styles.soundCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            (isActive || isQuickPlayActive) && {
              borderColor: theme.primary,
              backgroundColor: theme.card,
            },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: soundItem.color }]}
          >
            <Ionicons name={soundItem.icon} size={24} color="white" />
          </View>

          <View style={styles.soundInfo}>
            <Text style={[styles.soundName, { color: theme.text }]}>
              {soundItem.name}
            </Text>
            <Text
              style={[styles.soundDescription, { color: theme.textSecondary }]}
            >
              {soundItem.description}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Download indicator - show if sound is downloaded */}
            {downloadedSounds.has(soundItem.id) && (
              <View style={{ padding: 8 }}>
                <Ionicons name="cloud-done" size={20} color="#10b981" />
              </View>
            )}

            {/* PRO badge for premium sounds OR Heart icon for free sounds */}
            {soundItem.premium ? (
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
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFavorite(soundItem.id);
                }}
                style={{
                  padding: 8,
                }}
              >
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
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

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

      {/* Pro Upgrade Banner - only show if not pro */}
      {!pro && (
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
              <Ionicons name="star" size={20} color="#FFD700" />
            </View>
            <View style={styles.proBannerText}>
              <Text style={styles.proBannerTitle}>Upgrade to Pro</Text>
              <Text style={styles.proBannerSubtitle}>
                Unlock all premium sounds & features
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
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
              setSelectedCategory("Favourites");
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                {
                  color:
                    selectedCategory === "Favourites" ? "white" : theme.text,
                },
              ]}
            >
              Favourites
            </Text>
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
              setSelectedCategory(category);
            }}
          >
            <Text
              style={[
                styles.categoryTabText,
                {
                  color: selectedCategory === category ? "white" : theme.text,
                },
              ]}
            >
              {category}
            </Text>
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
          {WHITE_NOISE_SOUNDS.filter((sound) => {
            // Handle Favourites category
            if (selectedCategory === "Favourites") {
              return favorites?.has(sound.id) || false;
            }
            // Handle regular categories
            return (
              selectedCategory === SOUND_CATEGORIES.ALL ||
              sound.category === selectedCategory
            );
          })
            .sort((a, b) => {
              // Free sounds first, then premium
              if (a.premium !== b.premium) {
                return a.premium ? 1 : -1;
              }
              // Then alphabetically
              return a.name.localeCompare(b.name);
            })
            .map((soundItem, index) => (
              <SoundCard
                key={soundItem.id}
                soundItem={soundItem}
                index={index}
              />
            ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      {activeSounds.size > 0 && (
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

            <View style={styles.controlsRow}>
              <AnimatedControlButton
                onPress={() => {
                  if (!pro) {
                    setPaywallOpen(true);
                  } else {
                    setMixerModalVisible(true);
                  }
                }}
                iconName="options"
                style={{
                  backgroundColor:
                    activeSounds.size > 1 ? theme.primary : theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                iconColor={activeSounds.size > 1 ? "white" : theme.text}
              />
              <AnimatedControlButton
                onPress={() => setTimerModalVisible(true)}
                iconName="timer"
                style={{
                  backgroundColor: timerMinutes ? theme.primary : theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                iconColor={timerMinutes ? "white" : theme.text}
              />
              <AnimatedControlButton
                onPress={isPlaying ? pauseAllSounds : resumeAllSounds}
                iconName={isPlaying ? "pause" : "play"}
              />
              <AnimatedControlButton
                onPress={stopAllSounds}
                iconName="stop"
                style={{ backgroundColor: theme.error }}
              />
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
      {snackbarMessage !== "" && (
        <Animated.View
          style={{
            position: "absolute",
            top: 120,
            left: 20,
            right: 20,
            backgroundColor: theme.text,
            padding: 16,
            borderRadius: 12,
            opacity: snackbarOpacity,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 9999,
          }}
        >
          <Text
            style={{
              color: theme.background,
              fontSize: 14,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {snackbarMessage}
          </Text>
        </Animated.View>
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
}: any) {
  const { theme } = useTheme();
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
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
      >
        <Ionicons name={iconName} size={24} color={iconColor || "white"} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  proBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  proBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  proBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  proBannerText: {
    flex: 1,
  },
  proBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
  },
  proBannerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  header: {
    padding: 10,
    alignItems: "center",
    height: 65,
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
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
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
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
