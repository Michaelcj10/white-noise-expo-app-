import { PaywallModal } from "@/components/PaywallModal";
import { ShimmerLoader, SoundCardSkeleton } from "@/components/ShimmerLoader";
import {
  SOUND_CATEGORIES,
  SoundCategory,
  WHITE_NOISE_SOUNDS,
} from "@/constants/sound";
import { useAccessibility } from "@/contexts/accessibility";
import { useNotification } from "@/contexts/notification";
import { useQuickPlay } from "@/contexts/quickplay";
import { useRevenueCat } from "@/contexts/revenuecat";
import { Analytics } from "@/utils/analytics";
import { soundCache } from "@/utils/soundCache";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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

// Import the extracted SoundCard component
import { SoundCard, SoundItem, Theme } from "./SoundCard";

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
const MixerModal = React.memo(function MixerModal({
  visible,
  onClose,
  theme,
  themeMode,
  activeSounds,
  onToggleSound,
  favorites,
  onToggleFavorite,
  pro,
  isPlaying,
}: {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  themeMode: "light" | "dark";
  activeSounds: Map<
    number,
    { sound: any; soundItem: any; volume: number; isMuted: boolean }
  >;
  onToggleSound: (soundItem: any) => void;
  favorites: Set<number>;
  onToggleFavorite: (soundId: number) => void;
  pro: boolean;
  isPlaying: boolean;
}) {
  const [optimisticToggles, setOptimisticToggles] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    setOptimisticToggles(new Set());
  }, [activeSounds]);

  const handleToggleSound = useCallback(
    (soundItem: any) => {
      setOptimisticToggles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(soundItem.id)) {
          newSet.delete(soundItem.id);
        } else {
          newSet.add(soundItem.id);
        }
        return newSet;
      });
      onToggleSound(soundItem);
    },
    [onToggleSound],
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleFavoritePress = useCallback(
    (soundId: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleFavorite(soundId);
    },
    [onToggleFavorite],
  );

  // Memoize first sound ID calculation
  const firstSoundId = useMemo(() => {
    return activeSounds.size > 0 ? Array.from(activeSounds.keys())[0] : null;
  }, [activeSounds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={mixerStyles.overlay}>
        <View
          style={[
            mixerStyles.container,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={mixerStyles.header}>
            <Text style={[mixerStyles.title, { color: theme.text }]}>
              Sound Mixer
            </Text>
          </View>
          <Text style={[mixerStyles.subtitle, { color: theme.textSecondary }]}>
            Mix multiple sounds together
          </Text>

          <TouchableOpacity
            onPress={handleClose}
            style={[mixerStyles.doneButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={mixerStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {WHITE_NOISE_SOUNDS.map((soundItem) => {
              const isOptimistic = optimisticToggles.has(soundItem.id);
              const isActuallyActive = activeSounds.has(soundItem.id);
              const isActive = isOptimistic
                ? !isActuallyActive
                : isActuallyActive;
              const isLocked = soundItem.premium && !pro;
              const isFirstSound =
                isActuallyActive && soundItem.id === firstSoundId;
              const cannotUnselect =
                isFirstSound && isPlaying && activeSounds.size > 1;

              return (
                <View
                  key={soundItem.id}
                  style={[
                    mixerStyles.soundItem,
                    {
                      backgroundColor: isActive ? theme.card : theme.background,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View style={mixerStyles.soundRow}>
                    <View
                      style={[
                        mixerStyles.soundIcon,
                        { backgroundColor: soundItem.color },
                      ]}
                    >
                      <Ionicons
                        name={soundItem.icon as any}
                        size={20}
                        color="white"
                      />
                    </View>
                    <View style={mixerStyles.soundInfo}>
                      <Text
                        style={[mixerStyles.soundName, { color: theme.text }]}
                      >
                        {soundItem.name}
                      </Text>
                      <Text
                        style={[
                          mixerStyles.soundDesc,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {soundItem.description}
                      </Text>
                    </View>
                    {isLocked ? (
                      <View
                        style={[
                          mixerStyles.proBadge,
                          {
                            backgroundColor:
                              themeMode === "light" ? "#9b8fa8" : "#8b5cf6",
                          },
                        ]}
                      >
                        <Text style={mixerStyles.proBadgeText}>PRO</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleFavoritePress(soundItem.id)}
                        style={mixerStyles.heartButton}
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
                        style={mixerStyles.lockIcon}
                      />
                    )}
                    <Switch
                      value={isActive}
                      onValueChange={() => handleToggleSound(soundItem)}
                      disabled={cannotUnselect}
                      trackColor={{ false: theme.border, true: theme.primary }}
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
});

const mixerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0006", justifyContent: "flex-end" },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { opacity: 0.7, marginBottom: 20 },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  doneButtonText: { color: "white", fontWeight: "600" },
  soundItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  soundRow: { flexDirection: "row", alignItems: "center" },
  soundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundInfo: { flex: 1 },
  soundName: { fontSize: 16, fontWeight: "600" },
  soundDesc: { fontSize: 12 },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  proBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heartButton: { padding: 8, marginRight: 8 },
  lockIcon: { marginRight: 8, opacity: 0.6 },
});

/* ---------- Timer Modal ---------- */
const TIMER_OPTIONS = [
  { label: "No Timer", value: null },
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "3 hours", value: 180 },
  { label: "6 hours", value: 360 },
  { label: "8 hours", value: 480 },
];

const TimerModal = React.memo(function TimerModal({
  visible,
  onClose,
  onSetTimer,
  theme,
  currentTimer,
}: {
  visible: boolean;
  onClose: () => void;
  onSetTimer: (minutes: number | null) => void;
  theme: Theme;
  currentTimer: number | null;
}) {
  const handleSelectTimer = useCallback(
    (value: number | null) => {
      onSetTimer(value);
      onClose();
    },
    [onSetTimer, onClose],
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={timerStyles.overlay}>
        <View
          style={[
            timerStyles.container,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={[timerStyles.doneButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={timerStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <View style={timerStyles.header}>
            <Text style={[timerStyles.title, { color: theme.text }]}>
              Sleep Timer
            </Text>
          </View>
          <Text style={[timerStyles.subtitle, { color: theme.textSecondary }]}>
            Set how long the sound should play
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {TIMER_OPTIONS.map((option, index) => {
              const isSelected = currentTimer === option.value;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectTimer(option.value)}
                  style={[
                    timerStyles.option,
                    {
                      backgroundColor: isSelected
                        ? theme.primary + "20"
                        : theme.card,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.value === null ? "close-circle" : "timer"}
                    size={24}
                    color={isSelected ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      timerStyles.optionText,
                      {
                        color: theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={theme.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const timerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0006", justifyContent: "flex-end" },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    maxHeight: "70%",
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  doneButtonText: { color: "white", fontWeight: "600" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { opacity: 0.7, marginBottom: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: { fontSize: 16, marginLeft: 12, flex: 1 },
});

/* ================== EMPTY STATE ================== */
const EmptyPlayerState = React.memo(function EmptyPlayerState({
  theme,
}: {
  theme: Theme;
}) {
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
    <View style={emptyStyles.container}>
      <Animated.View
        style={[emptyStyles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
      >
        <View
          style={[
            emptyStyles.iconCircle,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Ionicons name="musical-notes" size={48} color={theme.primary} />
        </View>
      </Animated.View>
      <Text style={[emptyStyles.title, { color: theme.text }]}>
        No Sounds Playing
      </Text>
      <Text style={[emptyStyles.subtitle, { color: theme.textSecondary }]}>
        Tap on any sound below to start your relaxing experience
      </Text>
    </View>
  );
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconWrapper: { marginBottom: 24 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
});

/* ================== CATEGORY TAB ================== */
const CategoryTab = React.memo(function CategoryTab({
  category,
  isSelected,
  theme,
  customColor,
  onPress,
}: {
  category: string;
  isSelected: boolean;
  theme: Theme;
  customColor?: string;
  onPress: () => void;
}) {
  const backgroundColor = isSelected
    ? customColor || theme.primary
    : theme.surface;

  return (
    <TouchableOpacity
      style={[
        categoryStyles.tab,
        { backgroundColor, borderColor: theme.border },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          categoryStyles.text,
          {
            color: isSelected ? "white" : theme.text,
            fontWeight: isSelected ? "700" : "600",
          },
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
});

const categoryStyles = StyleSheet.create({
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: "600" },
});

/* ================== NETWORK & ANALYTICS ================== */
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch {
    return false;
  }
};

const safeAnalytics = {
  trackSoundPlayed: (
    id: number,
    name: string,
    premium: boolean,
    mode: "single" | "mixer",
  ) => {
    try {
      Analytics.trackSoundPlayed(id, name, premium, mode);
    } catch {}
  },
  trackSoundPaused: () => {
    try {
      Analytics.trackSoundPaused();
    } catch {}
  },
  trackSoundResumed: () => {
    try {
      Analytics.trackSoundResumed();
    } catch {}
  },
  trackAllSoundsStopped: (count: number) => {
    try {
      Analytics.trackAllSoundsStopped(count);
    } catch {}
  },
  trackTimerSet: (minutes: number) => {
    try {
      Analytics.trackTimerSet(minutes);
    } catch {}
  },
  trackTimerCleared: () => {
    try {
      Analytics.trackTimerCleared();
    } catch {}
  },
  trackTimerCompleted: (minutes: number) => {
    try {
      Analytics.trackTimerCompleted(minutes);
    } catch {}
  },
  trackPaywallViewed: (source: string) => {
    try {
      Analytics.trackPaywallViewed(source as any);
    } catch {}
  },
  trackFavoriteAdded: (id: number, name: string, premium: boolean) => {
    try {
      Analytics.trackFavoriteAdded(id, name, premium);
    } catch {}
  },
  trackFavoriteRemoved: (id: number, name: string) => {
    try {
      Analytics.trackFavoriteRemoved(id, name);
    } catch {}
  },
  trackSoundDownloaded: (id: number, name: string) => {
    try {
      Analytics.trackSoundDownloaded(id, name);
    } catch {}
  },
  trackCategorySelected: (category: string, count: number) => {
    try {
      Analytics.trackCategorySelected(category, count);
    } catch {}
  },
  incrementUserProperty: (property: string, value: number) => {
    try {
      Analytics.incrementUserProperty(property, value);
    } catch {}
  },
};

/* ================== ANIMATED CONTROL BUTTON ================== */
const AnimatedControlButton = React.memo(function AnimatedControlButton({
  onPress,
  iconName,
  style = {},
  iconColor,
  size = 24,
  theme,
}: {
  onPress?: () => void;
  iconName: string;
  style?: any;
  iconColor?: string;
  size?: number;
  theme: Theme;
}) {
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
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
  }, [onPress, buttonScale]);

  return (
    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
      <TouchableOpacity
        style={[
          controlStyles.button,
          { backgroundColor: theme.primary },
          style,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <Ionicons
          name={iconName as any}
          size={size}
          color={iconColor || "white"}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

const controlStyles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    elevation: 5,
  },
});

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

  const insets = useSafeAreaInsets();
  const { textSize, highContrastMode } = useAccessibility();

  // Memoize theme to prevent unnecessary re-renders
  const theme = useMemo(
    () => (highContrastMode ? getHighContrastTheme(baseTheme) : baseTheme),
    [highContrastMode, baseTheme],
  ) as Theme;

  // Memoize scaled font sizes
  const scaledFontSizes = useMemo(() => {
    const multiplier =
      textSize === "small" ? 0.85 : textSize === "large" ? 1.15 : 1;
    return {
      name: Math.round(18 * multiplier),
      description: Math.round(14 * multiplier),
    };
  }, [textSize]);

  // State
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
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [mixerModalVisible, setMixerModalVisible] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [downloadedSounds, setDownloadedSounds] = useState<Set<number>>(
    new Set([0, 1, 2]),
  );
  const [downloadingStates, setDownloadingStates] = useState<Set<number>>(
    new Set(),
  );

  // Refs
  const timerIntervalRef = useRef<any>(null);
  const playerSlide = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const activeSoundsRef = useRef(activeSounds);

  // RevenueCat
  const { isPro: pro, isLoading: revenueCatLoading } = useRevenueCat();
  const { showNotification } = useNotification();

  // Snackbar state
  const [snackbars, setSnackbars] = useState<{ id: number; message: string }[]>(
    [],
  );
  const snackbarIdCounter = useRef(0);
  const snackbarAnimRefs = useRef<
    Map<number, { opacity: Animated.Value; translateY: Animated.Value }>
  >(new Map());

  // ==================== MEMOIZED CALLBACKS ====================

  // Modal handlers
  const openTimerModal = useCallback(() => setTimerModalVisible(true), []);
  const closeTimerModal = useCallback(() => setTimerModalVisible(false), []);
  const closeMixerModal = useCallback(() => setMixerModalVisible(false), []);
  const closePaywall = useCallback(() => setPaywallOpen(false), []);

  const openMixerModal = useCallback(() => {
    if (!pro) {
      setPaywallOpen(true);
    } else {
      setMixerModalVisible(true);
    }
  }, [pro]);

  const openPaywall = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPaywallOpen(true);
  }, []);

  // Snackbar
  const showSnackbar = useCallback((message: string) => {
    const id = snackbarIdCounter.current++;
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(0);

    snackbarAnimRefs.current.set(id, { opacity, translateY });

    setSnackbars((prev) => {
      prev.forEach((snackbar, index) => {
        const anim = snackbarAnimRefs.current.get(snackbar.id);
        if (anim) {
          Animated.timing(anim.translateY, {
            toValue: (index + 1) * 70,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      });
      return [...prev, { id, message }];
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
        snackbarAnimRefs.current.delete(id);
        filtered.forEach((snackbar, index) => {
          const anim = snackbarAnimRefs.current.get(snackbar.id);
          if (anim) {
            Animated.timing(anim.translateY, {
              toValue: index * 70,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        });
        return filtered;
      });
    });
  }, []);

  // Audio session configuration
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

  // Fade functions
  const fadeInSound = useCallback(
    async (sound: any, targetVolume: number, duration: number = 1500) => {
      if (!sound) return;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const fade = () => {
        if (currentStep >= steps) {
          sound.setVolumeAsync(targetVolume).catch(() => {});
          return;
        }
        const progress = currentStep / steps;
        sound.setVolumeAsync(targetVolume * progress).catch(() => {});
        currentStep++;
        setTimeout(fade, stepDuration);
      };
      fade();
    },
    [],
  );

  const fadeOutSound = useCallback(
    async (sound: any, startVolume: number, duration: number = 1500) => {
      if (!sound) return;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const fade = () => {
        if (currentStep >= steps) {
          sound.setVolumeAsync(0).catch(() => {});
          return;
        }
        const progress = currentStep / steps;
        sound.setVolumeAsync(startVolume * (1 - progress)).catch(() => {});
        currentStep++;
        setTimeout(fade, stepDuration);
      };
      fade();
    },
    [],
  );

  // Retry helper
  const retryAudioOperation = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      operationName: string,
      maxRetries: number = 3,
      delayMs: number = 500,
    ): Promise<T | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
      return null;
    },
    [],
  );

  // Cleanup sounds
  const cleanupExistingSounds = useCallback(async (): Promise<void> => {
    if (activeSoundsRef.current.size === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_id, data] of activeSoundsRef.current.entries()) {
      if (data?.sound) {
        try {
          data.sound.setOnPlaybackStatusUpdate(null);
          await data.sound.pauseAsync().catch(() => {});
          await data.sound.stopAsync().catch(() => {});
          await data.sound.unloadAsync().catch(() => {});
        } catch {}
      }
    }

    try {
      await hidePlayingNotification();
    } catch {}
  }, []);

  // Load new sound
  const loadNewSound = useCallback(
    async (soundItem: any) => {
      let source: any;
      try {
        const sourcePromise = soundCache.getSource(soundItem, true, true);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000),
        );
        source = await Promise.race([sourcePromise, timeoutPromise]);
      } catch {
        throw new Error(`Cannot load ${soundItem.name}`);
      }

      if (!soundCache.isDownloaded(soundItem.id)) {
        soundCache.onDownloadComplete(
          soundItem.id,
          (completedId: number, success: boolean) => {
            if (success) {
              setDownloadedSounds((prev) => new Set(prev).add(completedId));
              const sound = WHITE_NOISE_SOUNDS.find(
                (s) => s.id === completedId,
              );
              if (sound) {
                showSnackbar(`${sound.name} saved for offline`);
                safeAnalytics.trackSoundDownloaded(completedId, sound.name);
              }
            }
          },
        );
      }

      if (soundCache.isDownloaded(soundItem.id)) {
        setDownloadedSounds((prev) => new Set(prev).add(soundItem.id));
      }

      // Reconfigure audio session before creating sound (fixes stale session after idle)
      await configureAudioSession();

      // Create sound with timeout to prevent infinite hang when audio system is stalled
      const createSoundPromise = Audio.Sound.createAsync(
        source,
        {
          isLooping: true,
          volume: 0,
          shouldPlay: false,
          progressUpdateIntervalMillis: 1000,
          androidImplementation: "MediaPlayer",
        },
        undefined,
        false,
      );

      const createSoundTimeout = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Audio creation timeout - audio system may be stalled"),
            ),
          10000,
        ),
      );

      const { sound: newSound } = await Promise.race([
        createSoundPromise,
        createSoundTimeout,
      ]);

      return {
        sound: newSound,
        soundItem,
        volume: 0.5,
        isMuted: globalMuted,
        id: soundItem.id,
      };
    },
    [globalMuted, showSnackbar, configureAudioSession],
  );

  // ==================== SOUND CARD HANDLERS (MEMOIZED) ====================

  const handlePlaySound = useCallback(
    async (soundItem: SoundItem) => {
      if (soundItem.premium && !pro) {
        safeAnalytics.trackPaywallViewed("premium_sound");
        setPaywallOpen(true);
        return;
      }

      safeAnalytics.trackSoundPlayed(
        soundItem.id,
        soundItem.name,
        soundItem.premium,
        "single",
      );

      if (
        activeSounds.size === 1 &&
        activeSounds.has(soundItem.id) &&
        isPlaying
      ) {
        return;
      }

      setLoadingSounds((prev) => new Set(prev).add(soundItem.id));
      setTimerMinutes(null);
      setTimerSeconds(0);

      try {
        const [, soundData] = await Promise.all([
          cleanupExistingSounds(),
          loadNewSound(soundItem),
        ]);

        setLoadingSounds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });

        const playSuccess = await retryAudioOperation(
          () => soundData.sound.playAsync(),
          "Play",
          3,
          500,
        );

        if (!playSuccess) {
          showSnackbar(`Failed to play ${soundItem.name}`);
          return;
        }

        fadeInSound(
          soundData.sound,
          soundData.isMuted ? 0 : soundData.volume,
          500,
        );

        const newActiveSounds = new Map();
        newActiveSounds.set(soundItem.id, soundData);

        setActiveSounds(newActiveSounds);
        setIsPlaying(true);
        setSelectedSounds(new Set());

        showPlayingNotification(soundItem.name, false).catch(() => {});
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        setLoadingSounds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });
        showNotification("Playback Error", "Could not play sound.", "error");
      }
    },
    [
      pro,
      cleanupExistingSounds,
      loadNewSound,
      retryAudioOperation,
      fadeInSound,
      showSnackbar,
      showNotification,
    ],
  );

  const handleToggleFavorite = useCallback(
    (soundId: number) => {
      const sound = WHITE_NOISE_SOUNDS.find((s) => s.id === soundId);
      const isPremium = sound?.premium || false;

      if (isPremium && !pro) {
        safeAnalytics.trackPaywallViewed("favorite");
        setPaywallOpen(true);
        return;
      }

      setFavorites((prev) => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(soundId)) {
          newFavorites.delete(soundId);
          safeAnalytics.trackFavoriteRemoved(soundId, sound?.name || "Unknown");
        } else {
          newFavorites.add(soundId);
          safeAnalytics.trackFavoriteAdded(
            soundId,
            sound?.name || "Unknown",
            isPremium,
          );
          safeAnalytics.incrementUserProperty("total_favorites_added", 1);
        }

        // Save to storage
        Storage.setItem(
          FAVORITES_KEY,
          JSON.stringify(Array.from(newFavorites)),
        );

        return newFavorites;
      });
    },
    [pro],
  );

  const handleDownloadSound = useCallback(
    async (soundItem: SoundItem) => {
      const isFreeDownloadable = !soundItem.premium;

      if (!pro && !isFreeDownloadable) {
        showSnackbar("Upgrade to Pro to save sounds for offline use");
        safeAnalytics.trackPaywallViewed("offline_limit");
        setPaywallOpen(true);
        return;
      }

      if (soundItem.isLocal || downloadingStates.has(soundItem.id)) return;

      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        showSnackbar("Cannot download in offline mode.");
        return;
      }

      setDownloadingStates((prev) => new Set(prev).add(soundItem.id));

      try {
        const success = await soundCache.initiateDownload(soundItem, pro);
        if (success) {
          setDownloadedSounds((prev) => new Set(prev).add(soundItem.id));
          showSnackbar(`${soundItem.name} saved for offline use!`);
          safeAnalytics.trackSoundDownloaded(soundItem.id, soundItem.name);
        } else {
          if (!pro && !soundCache.canDownloadMore(pro)) {
            showSnackbar(
              "Free users can save 1 offline sound. Upgrade to Pro for unlimited.",
            );
            safeAnalytics.trackPaywallViewed("offline_limit");
            setPaywallOpen(true);
          } else {
            showSnackbar(`Failed to download ${soundItem.name}`);
          }
        }
      } catch {
        showSnackbar(`Error downloading ${soundItem.name}`);
      } finally {
        setDownloadingStates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundItem.id);
          return newSet;
        });
      }
    },
    [pro, downloadingStates, showSnackbar],
  );

  // ==================== PLAYBACK CONTROLS ====================

  const pauseAllSounds = useCallback(async () => {
    for (const [, data] of activeSounds.entries()) {
      if (data?.sound) {
        await fadeOutSound(data.sound, data.volume, 1000);
        await data.sound.pauseAsync().catch(() => {});
      }
    }
    setIsPlaying(false);
    safeAnalytics.trackSoundPaused();

    const firstSound = Array.from(activeSounds.values())[0];
    if (firstSound?.soundItem?.name) {
      showPlayingNotification(firstSound.soundItem.name, true).catch(() => {});
    }
  }, [activeSounds, fadeOutSound]);

  const resumeAllSounds = useCallback(async () => {
    for (const [, data] of activeSounds.entries()) {
      if (data?.sound) {
        await data.sound.setVolumeAsync(0);
        await retryAudioOperation(
          () => data.sound.playAsync(),
          "Resume",
          3,
          300,
        );
        fadeInSound(data.sound, data.volume, 1000);
      }
    }
    setIsPlaying(true);
    safeAnalytics.trackSoundResumed();

    const firstSound = Array.from(activeSounds.values())[0];
    if (firstSound?.soundItem?.name) {
      showPlayingNotification(firstSound.soundItem.name, false).catch(() => {});
    }
  }, [activeSounds, retryAudioOperation, fadeInSound]);

  const stopAllSounds = useCallback(async () => {
    const soundCount = activeSoundsRef.current.size;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    for (const [, data] of activeSoundsRef.current.entries()) {
      if (data?.sound) {
        try {
          data.sound.setOnPlaybackStatusUpdate(null);
          await data.sound.pauseAsync().catch(() => {});
          await data.sound.stopAsync().catch(() => {});
          await data.sound.unloadAsync().catch(() => {});
        } catch {}
      }
    }

    setActiveSounds(new Map());
    setIsPlaying(false);
    setTimerMinutes(null);
    setTimerSeconds(0);
    setGlobalMuted(false);

    if (soundCount > 0) {
      safeAnalytics.trackAllSoundsStopped(soundCount);
    }

    hidePlayingNotification().catch(() => {});
  }, []);

  const toggleSoundInMixer = useCallback(
    async (soundItem: any) => {
      const newActiveSounds = new Map(activeSounds);

      if (newActiveSounds.has(soundItem.id)) {
        const data = newActiveSounds.get(soundItem.id);
        if (data?.sound) {
          data.sound.setOnPlaybackStatusUpdate(null);
          await data.sound.stopAsync().catch(() => {});
          await data.sound.unloadAsync().catch(() => {});
        }
        newActiveSounds.delete(soundItem.id);
        setActiveSounds(newActiveSounds);
      } else {
        if (newActiveSounds.size >= 3) {
          showSnackbar("Maximum 3 sounds can be mixed together");
          return;
        }

        setLoadingSounds((prev) => new Set(prev).add(soundItem.id));

        try {
          const soundData = await loadNewSound(soundItem);

          setLoadingSounds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(soundItem.id);
            return newSet;
          });

          if (isPlaying) {
            await retryAudioOperation(
              () => soundData.sound.playAsync(),
              "Mixer play",
              3,
              500,
            );
          }

          newActiveSounds.set(soundItem.id, soundData);
          setActiveSounds(newActiveSounds);
        } catch {
          setLoadingSounds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(soundItem.id);
            return newSet;
          });
          showNotification("Playback Error", "Could not load sound.", "error");
        }
      }

      if (newActiveSounds.size > 0 && !isPlaying) {
        setIsPlaying(true);
      } else if (newActiveSounds.size === 0) {
        setIsPlaying(false);
      }
    },
    [
      activeSounds,
      isPlaying,
      loadNewSound,
      retryAudioOperation,
      showSnackbar,
      showNotification,
    ],
  );

  const handleSetTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      safeAnalytics.trackTimerCleared();
    } else {
      safeAnalytics.trackTimerSet(minutes);
    }
    setTimerMinutes(minutes);
    setTimerSeconds(minutes ? minutes * 60 : 0);
  }, []);

  // Category selection
  const handleSelectCategory = useCallback(
    (category: SoundCategory | "Favourites" | "Downloaded") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCategory(category);
    },
    [],
  );

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // ==================== EFFECTS ====================

  // Initialize audio
  useEffect(() => {
    let mounted = true;
    const initAudio = async () => {
      if (!mounted) return;
      try {
        await soundCache.initialize();
        const downloadedIds = soundCache.getDownloadedSoundIds();
        setDownloadedSounds(new Set(downloadedIds));
        await configureAudioSession();
        setupAudioNotifications();
      } catch {}
    };
    initAudio();
    return () => {
      mounted = false;
    };
  }, [configureAudioSession]);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await Storage.getItem(FAVORITES_KEY);
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            setFavorites(new Set(ids));
          }
        }
      } catch {}
      setTimeout(() => setIsInitialLoad(false), 800);
    };
    loadFavorites();
  }, []);

  // Reload favorites on focus
  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        try {
          const stored = await Storage.getItem(FAVORITES_KEY);
          if (stored) {
            const ids = JSON.parse(stored);
            if (Array.isArray(ids)) {
              setFavorites(new Set(ids));
            }
          }
        } catch {}
      };
      loadFavorites();
    }, []),
  );

  // Reload downloaded sounds on focus (to reflect changes from settings)
  useFocusEffect(
    useCallback(() => {
      const downloadedIds = soundCache.getDownloadedSoundIds();
      const newDownloadedSounds = new Set(downloadedIds);
      setDownloadedSounds(newDownloadedSounds);

      // If offline tab is selected and no more offline sounds, switch to "All"
      if (selectedCategory === "Downloaded" && newDownloadedSounds.size === 0) {
        setSelectedCategory(SOUND_CATEGORIES.ALL);
      }
    }, [selectedCategory]),
  );

  // Timer effect
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timerMinutes !== null && isPlaying) {
      let remaining = timerMinutes * 60;
      timerIntervalRef.current = setInterval(() => {
        remaining--;
        setTimerSeconds(remaining);
        if (remaining <= 0) {
          safeAnalytics.trackTimerCompleted(timerMinutes);
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerMinutes, isPlaying]);

  // Timer completion
  useEffect(() => {
    if (timerMinutes !== null && timerSeconds === 0 && isPlaying) {
      stopAllSounds();
    }
  }, [timerSeconds, timerMinutes, isPlaying, stopAllSounds]);

  // Sync playing state
  useEffect(() => {
    setIsMainPlaying(isPlaying);
  }, [isPlaying, setIsMainPlaying]);

  // Register stop callback
  const stopAllSoundsRef = useRef(stopAllSounds);
  useEffect(() => {
    stopAllSoundsRef.current = stopAllSounds;
  }, [stopAllSounds]);
  useEffect(() => {
    setStopMainSounds(async () => await stopAllSoundsRef.current());
    return () => {
      setStopMainSounds(null);
    };
  }, [setStopMainSounds]);

  // Player slide animation
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

  // Clear selected when active changes
  useEffect(() => {
    if (activeSounds.size > 0) {
      setSelectedSounds(new Set());
    }
  }, [activeSounds.size]);

  // App state changes
  const pauseAllSoundsRef = useRef(pauseAllSounds);
  useEffect(() => {
    pauseAllSoundsRef.current = pauseAllSounds;
  }, [pauseAllSounds]);

  // Track previous app state to detect foreground transitions
  const appStateRef = useRef(AppState.currentState);
  const configureAudioSessionRef = useRef(configureAudioSession);

  useEffect(() => {
    configureAudioSessionRef.current = configureAudioSession;
  }, [configureAudioSession]);

  useEffect(() => {
    const handleAppStateChange = async (
      nextAppState: typeof AppState.currentState,
    ) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // When app becomes active after being inactive/background, reconfigure audio session
      // This fixes the "spinning forever" bug when audio system becomes stale after idle
      if (
        nextAppState === "active" &&
        (previousState === "background" || previousState === "inactive")
      ) {
        try {
          await configureAudioSessionRef.current();
        } catch {}
      }

      // Pause sounds when going to background (if background play disabled)
      if (
        (nextAppState === "background" || nextAppState === "inactive") &&
        !backgroundPlayEnabled &&
        activeSoundsRef.current.size > 0
      ) {
        pauseAllSoundsRef.current();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [backgroundPlayEnabled]);

  // Notification listener
  const notificationPauseRef = useRef(pauseAllSounds);
  const notificationResumeRef = useRef(resumeAllSounds);
  useEffect(() => {
    notificationPauseRef.current = pauseAllSounds;
    notificationResumeRef.current = resumeAllSounds;
  }, [pauseAllSounds, resumeAllSounds]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const action = response.actionIdentifier;
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

  // Update ref to track current activeSounds
  useEffect(() => {
    activeSoundsRef.current = activeSounds;
  }, [activeSounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeSoundsRef.current.forEach((data) => {
        data.sound.unloadAsync().catch(() => {});
      });
    };
  }, []);

  // ==================== MEMOIZED DATA ====================

  const filteredSounds = useMemo(() => {
    return WHITE_NOISE_SOUNDS.filter((sound) => {
      if (selectedCategory === "Favourites") return favorites.has(sound.id);
      if (selectedCategory === "Downloaded")
        return sound.isLocal || downloadedSounds.has(sound.id);
      return (
        selectedCategory === SOUND_CATEGORIES.ALL ||
        sound.category === selectedCategory
      );
    });
  }, [selectedCategory, favorites, downloadedSounds]);

  const firstActiveSound = useMemo(() => {
    return activeSounds.size > 0 ? Array.from(activeSounds.values())[0] : null;
  }, [activeSounds]);

  const additionalSounds = useMemo(() => {
    return activeSounds.size > 1
      ? Array.from(activeSounds.values()).slice(1)
      : [];
  }, [activeSounds]);

  // ==================== RENDER ====================

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

      {/* Loading banner */}
      {revenueCatLoading && !pro && (
        <View style={styles.bannerContainer}>
          <ShimmerLoader width="100%" height={60} borderRadius={12} />
        </View>
      )}

      {/* Pro banner */}
      {!revenueCatLoading && !pro && (
        <View
          style={[
            styles.proBanner,
            { backgroundColor: themeMode === "light" ? "#9b8fa8" : "#8b5cf6" },
          ]}
        >
          <TouchableOpacity
            onPress={openPaywall}
            style={styles.proBannerTouchable}
          >
            <Ionicons name="star" size={20} color="#fff" />
            <Text style={styles.proBannerText}>
              Upgrade to Pro - Unlock 44 Premium Sounds
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {favorites.size > 0 && (
          <CategoryTab
            category="Favourites"
            isSelected={selectedCategory === "Favourites"}
            theme={theme}
            onPress={() => handleSelectCategory("Favourites")}
          />
        )}
        {downloadedSounds.size > 0 && (
          <CategoryTab
            category="Offline"
            isSelected={selectedCategory === "Downloaded"}
            theme={theme}
            customColor="#10b981"
            onPress={() => handleSelectCategory("Downloaded")}
          />
        )}
        {Object.values(SOUND_CATEGORIES).map((category) => (
          <CategoryTab
            key={category}
            category={category}
            isSelected={selectedCategory === category}
            theme={theme}
            onPress={() => handleSelectCategory(category)}
          />
        ))}
      </ScrollView>

      {/* Sound list */}
      <View style={styles.soundsList}>
        {isInitialLoad ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <View style={{ height: 100 }} />
          </ScrollView>
        ) : filteredSounds.length === 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <EmptyPlayerState theme={theme} />
          </ScrollView>
        ) : (
          <FlashList
            data={filteredSounds}
            renderItem={({ item: soundItem }) => (
              <SoundCard
                soundItem={soundItem as SoundItem}
                isActive={activeSounds.has(soundItem.id)}
                isLoading={loadingSounds.has(soundItem.id)}
                isFavorite={favorites.has(soundItem.id)}
                isDownloaded={downloadedSounds.has(soundItem.id)}
                isDownloading={downloadingStates.has(soundItem.id)}
                isQuickPlayActive={
                  isQuickPlaying && favoriteSoundId === String(soundItem.id)
                }
                isPro={pro}
                theme={theme}
                themeMode={themeMode}
                scaledNameSize={scaledFontSizes.name}
                scaledDescSize={scaledFontSizes.description}
                onPress={handlePlaySound}
                onFavorite={handleToggleFavorite}
                onDownload={handleDownloadSound}
              />
            )}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        )}
      </View>

      {/* Player controls */}
      {(activeSounds.size > 0 || selectedSounds.size > 0) && (
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
          {timerMinutes !== null && (
            <View style={styles.timerDisplay}>
              <Ionicons name="timer-outline" size={14} color={theme.primary} />
              <Text style={[styles.timerText, { color: theme.primary }]}>
                {formatTime(timerSeconds)}
              </Text>
            </View>
          )}

          <View style={styles.playerRow}>
            {(activeSounds.size > 0 || selectedSounds.size > 0) && (
              <View style={styles.soundInfoContainer}>
                <View
                  style={[
                    styles.soundIconCircle,
                    {
                      backgroundColor:
                        firstActiveSound?.soundItem?.color ||
                        WHITE_NOISE_SOUNDS.find(
                          (s) => s.id === Array.from(selectedSounds)[0],
                        )?.color,
                    },
                  ]}
                >
                  {activeSounds.size > 0 &&
                  !loadingSounds.has(firstActiveSound?.soundItem?.id) ? (
                    <Ionicons
                      name={
                        firstActiveSound?.soundItem?.icon || "musical-notes"
                      }
                      size={22}
                      color="white"
                    />
                  ) : selectedSounds.size > 0 ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="musical-notes" size={22} color="white" />
                  )}
                </View>

                <View style={styles.soundNameContainer}>
                  <Text
                    numberOfLines={1}
                    style={[styles.soundNameText, { color: theme.text }]}
                  >
                    {firstActiveSound?.soundItem?.name ||
                      WHITE_NOISE_SOUNDS.find(
                        (s) => s.id === Array.from(selectedSounds)[0],
                      )?.name ||
                      "No sound"}
                  </Text>
                  {additionalSounds.length > 0 && (
                    <View style={styles.additionalSoundsRow}>
                      {additionalSounds.map((data) => (
                        <View
                          key={data.soundItem.id}
                          style={[
                            styles.additionalSoundBadge,
                            { backgroundColor: data.soundItem.color },
                          ]}
                        >
                          <Ionicons
                            name={data.soundItem.icon}
                            size={12}
                            color="white"
                          />
                          <Text
                            style={styles.additionalSoundText}
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
                      style={[styles.loadingText, { color: theme.primary }]}
                    >
                      Loading...
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.controlsRow}>
              <AnimatedControlButton
                onPress={openMixerModal}
                iconName="options"
                size={20}
                theme={theme}
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
                onPress={openTimerModal}
                iconName="timer"
                size={20}
                theme={theme}
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
                theme={theme}
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
                theme={theme}
                style={{ backgroundColor: theme.error, width: 40, height: 40 }}
                iconColor="white"
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Modals */}
      <MixerModal
        visible={mixerModalVisible}
        onClose={closeMixerModal}
        theme={theme}
        themeMode={themeMode}
        activeSounds={activeSounds}
        onToggleSound={toggleSoundInMixer}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        pro={pro}
        isPlaying={isPlaying}
      />
      <TimerModal
        visible={timerModalVisible}
        onClose={closeTimerModal}
        onSetTimer={handleSetTimer}
        theme={theme}
        currentTimer={timerMinutes}
      />
      <PaywallModal visible={paywallOpen} onClose={closePaywall} />

      {/* Snackbars */}
      {snackbars.map((snackbar, index) => {
        const anim = snackbarAnimRefs.current.get(snackbar.id);
        return (
          <Animated.View
            key={snackbar.id}
            style={[
              styles.snackbar,
              {
                backgroundColor: theme.primary,
                opacity: anim?.opacity,
                zIndex: 9999 - index,
                transform: [
                  { translateY: anim?.translateY || new Animated.Value(0) },
                ],
              },
            ]}
          >
            <Text style={styles.snackbarText}>{snackbar.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerContainer: { marginTop: 12, marginHorizontal: 16 },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 16,
  },
  proBannerTouchable: { flexDirection: "row", alignItems: "center", flex: 1 },
  proBannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  categoryTabs: {
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 16,
    maxHeight: 60,
  },
  categoryTabsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  soundsList: { flex: 1, padding: 10 },
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
  timerDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
  },
  timerText: { fontSize: 13, fontWeight: "600" },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  soundInfoContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  soundIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  soundNameContainer: { flex: 1, minWidth: 0 },
  soundNameText: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  additionalSoundsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  additionalSoundBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  additionalSoundText: { fontSize: 11, color: "white", fontWeight: "600" },
  loadingText: { fontSize: 12, fontWeight: "500" },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  snackbar: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  snackbarText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
