import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Modal,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBackgroundPlay } from "../../contexts/backgroundplay";
import { useTheme } from "../../contexts/themecontext";

/* ---------- Platform helpers ---------- */
const isWeb = Platform.OS === "web";
const isAndroid = Platform.OS === "android";

/* ---------- Storage (web-safe) ---------- */
const ENTITLEMENT_KEY = "entitlement_pro";

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

/* ---------- IAP (Android only; web-safe shims) ---------- */
const PRODUCT_ID = "pro_unlock";

// Lazy-require IAP only on Android to avoid web bundling issues
const IAP: any = isAndroid ? require("react-native-iap") : null;

async function iapInit(onEntitlement?: (owned: boolean) => void) {
  if (!isAndroid || !IAP) {
    // Web/iOS: just read stored entitlement
    const owned = (await Storage.getItem(ENTITLEMENT_KEY)) === "true";
    onEntitlement?.(owned);
    return;
  }
  await IAP.initConnection();
  const owned = await iapRestore();
  onEntitlement?.(owned);
}

async function iapEnd() {
  if (!isAndroid || !IAP) return;
  await IAP.endConnection();
}

async function iapLoadProduct(): Promise<any | null> {
  if (!isAndroid || !IAP) return null;
  const prods = await IAP.getProducts({ skus: [PRODUCT_ID] });
  return prods?.[0] ?? null;
}

async function iapBuy() {
  if (!isAndroid || !IAP)
    throw new Error("Purchases only supported on Android.");
  await IAP.requestPurchase({ skus: [PRODUCT_ID] });
}

async function iapRestore(): Promise<boolean> {
  if (!isAndroid || !IAP) {
    const owned = (await Storage.getItem(ENTITLEMENT_KEY)) === "true";
    return owned;
  }
  const purchases = await IAP.getAvailablePurchases();
  const owned = purchases.some((p: any) => p.productId === PRODUCT_ID);
  await Storage.setItem(ENTITLEMENT_KEY, owned ? "true" : "false");
  return owned;
}

async function iapIsPro(): Promise<boolean> {
  const v = await Storage.getItem(ENTITLEMENT_KEY);
  return v === "true";
}

/* ---------- Mixer Modal (Pro Feature) ---------- */
function MixerModal({
  visible,
  onClose,
  theme,
  activeSounds,
  onToggleSound,
  onVolumeChange,
  isPro,
  onOpenPaywall,
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
  isPro: boolean;
  onOpenPaywall: () => void;
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
            {!isPro && (
              <View
                style={{
                  backgroundColor: theme.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 12, fontWeight: "600" }}
                >
                  PRO
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              opacity: 0.7,
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            {isPro
              ? "Mix multiple sounds together"
              : "Upgrade to Pro to mix sounds"}
          </Text>

          {!isPro && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onOpenPaywall();
              }}
              style={{
                backgroundColor: theme.primary,
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>
                Unlock Sound Mixing
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {WHITE_NOISE_SOUNDS.filter((s) => !s.premium || isPro).map(
              (soundItem) => {
                const isActive = activeSounds.has(soundItem.id);
                const soundData = activeSounds.get(soundItem.id);
                const volume = localVolumes.get(soundItem.id) || 0.5;

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
                      opacity: isPro ? 1 : 0.6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: isActive ? 12 : 0,
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
                      <Switch
                        value={isActive}
                        onValueChange={(value: boolean) => {
                          if (isPro) onToggleSound(soundItem);
                        }}
                        disabled={!isPro}
                        trackColor={{
                          false: theme.border,
                          true: theme.primary,
                        }}
                        thumbColor={isActive ? "white" : theme.textSecondary}
                      />
                    </View>

                    {isActive && isPro && (
                      <VolumeSlider
                        soundId={soundItem.id}
                        soundItem={soundItem}
                        volume={volume}
                      />
                    )}
                  </View>
                );
              }
            )}
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
            maxHeight: "70%",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 6,
            }}
          >
            Sleep Timer
          </Text>
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
                onPress={() => {
                  onSetTimer(option.value);
                  onClose();
                }}
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
            onPress={onClose}
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

/* ---------- Paywall Modal (web-safe) ---------- */
export function Paywall({
  visible,
  onClose,
  onUnlock,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
  theme: any;
}) {
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    let subUpdate: any;
    let subError: any;

    async function boot() {
      await iapInit((owned) => {
        if (owned) {
          onUnlock();
          onClose();
        }
      });

      if (isAndroid && IAP) {
        // Listeners only on Android
        subUpdate = IAP.purchaseUpdatedListener(async (purchase: any) => {
          try {
            if (purchase.productId === PRODUCT_ID) {
              await IAP.finishTransaction({ purchase, isConsumable: false });
              await Storage.setItem(ENTITLEMENT_KEY, "true");
              onUnlock();
              onClose();
            }
          } catch (e) {
            console.warn("finishTransaction error", e);
          }
        });

        subError = IAP.purchaseErrorListener((err: any) => {
          console.warn("purchaseErrorListener", err);
        });

        const p = await iapLoadProduct();
        if (mounted) {
          setPrice(p?.localizedPrice ?? "");
          setLoading(false);
        }
      } else {
        // Web/iOS - no IAP
        setLoading(false);
      }
    }

    if (visible) boot();

    return () => {
      mounted = false;
      try {
        subUpdate?.remove?.();
        subError?.remove?.();
      } catch {}
      iapEnd();
    };
  }, [visible, onClose, onUnlock]);

  const onBuy = async () => {
    try {
      if (!isAndroid) {
        Alert.alert(
          "Not available",
          "Purchases are only available on Android."
        );
        return;
      }
      await iapBuy();
    } catch (e) {
      Alert.alert("Purchase failed", "Please try again.");
    }
  };

  const onRestorePress = async () => {
    setLoading(true);
    const ok = await iapRestore();
    setLoading(false);
    if (ok) {
      onUnlock();
      onClose();
    } else {
      Alert.alert("Nothing to restore", "No previous purchase found.");
    }
  };

  const isStoreDisabled = !isAndroid;

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
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 6,
            }}
          >
            Go Pro
          </Text>
          <Text
            style={{
              opacity: 0.7,
              color: theme.textSecondary,
              marginBottom: 16,
            }}
          >
            Unlock premium features:
          </Text>

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={{ color: theme.text, marginLeft: 8 }}>
                All premium 60-minute sounds
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={{ color: theme.text, marginLeft: 8 }}>
                Mix multiple sounds together
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={{ color: theme.text, marginLeft: 8 }}>
                One-time purchase, lifetime access
              </Text>
            </View>
          </View>

          {isStoreDisabled && (
            <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>
              Purchases are only supported on Android. You can still preview
              free sounds.
            </Text>
          )}

          {loading ? (
            <ActivityIndicator />
          ) : (
            <>
              <TouchableOpacity
                disabled={isStoreDisabled}
                onPress={onBuy}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isStoreDisabled
                    ? theme.border
                    : theme.primary,
                  alignItems: "center",
                  marginBottom: 8,
                  opacity: isStoreDisabled ? 0.8 : 1,
                }}
                activeOpacity={0.9}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {isStoreDisabled
                    ? "Unlock (Android only)"
                    : `Unlock Pro • ${price || "—"}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onRestorePress}
                style={{ padding: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600", color: theme.text }}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8, alignItems: "center", marginTop: 8 }}
          >
            <Text style={{ color: theme.textSecondary }}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ================== YOUR SCREEN (with gate) ================== */
export default function SoundsScreen() {
  const { theme, themeMode } = useTheme();
  const { backgroundPlayEnabled } = useBackgroundPlay();

  // Multiple sounds support
  const [activeSounds, setActiveSounds] = useState<
    Map<
      number,
      {
        sound: any;
        soundItem: any;
        volume: number;
        isMuted: boolean;
      }
    >
  >(new Map());

  const [isPlaying, setIsPlaying] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [mixerModalVisible, setMixerModalVisible] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // Paywall state
  const [pro, setPro] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const playerSlide = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    configureAudioSession();
  }, [backgroundPlayEnabled]);

  // Entitlement on mount
  useEffect(() => {
    iapIsPro()
      .then(setPro)
      .catch(() => setPro(false));
  }, []);

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
  }, [timerMinutes, isPlaying, timerSeconds]);

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
        await configureAudioSession();
        const { sound: newSound } = await Audio.Sound.createAsync(
          soundItem.source,
          {
            isLooping: true,
            volume: globalMuted ? 0 : 0.5,
            shouldPlay: isPlaying,
          }
        );

        newActiveSounds.set(soundItem.id, {
          sound: newSound,
          soundItem,
          volume: 0.5,
          isMuted: globalMuted,
        });
      } catch (error) {
        Alert.alert("Error", "Could not play sound. Please try again later.");
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
    const entitled = await iapIsPro();
    setPro(entitled);

    if (soundItem.premium && !entitled) {
      setPaywallOpen(true);
      return;
    }

    // Stop all other sounds and play just this one
    await stopAllSounds();
    await playSingleSound(soundItem);
  };

  const playSingleSound = async (soundItem: any) => {
    try {
      await configureAudioSession();

      const { sound: newSound } = await Audio.Sound.createAsync(
        soundItem.source,
        {
          isLooping: true,
          volume: globalMuted ? 0 : 0.5,
          shouldPlay: true,
        }
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
  };

  const resumeAllSounds = async () => {
    try {
      for (const [id, data] of activeSounds.entries()) {
        await data.sound.playAsync();
      }
      setIsPlaying(true);
    } catch (error) {
      Alert.alert("Error", "Could not resume sounds.");
      console.error("Error resuming sounds:", error);
    }
  };

  const stopAllSounds = async () => {
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
    } catch (error) {
      Alert.alert("Error", "Could not stop sounds.");
      console.error("Error stopping sounds:", error);
    }
  };

  const handleOverlayPress = () => {
    stopAllSounds();
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
    const cardScale = useRef(new Animated.Value(0.9)).current;
    const iconRotation = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isActive = activeSounds.has(soundItem.id);

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Gate playback
      tryPlaySingle(soundItem);
    };

    const locked = soundItem.premium && !pro;

    return (
      <Animated.View style={{}}>
        <TouchableOpacity
          style={[
            styles.soundCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isActive && {
              borderColor: theme.primary,
              backgroundColor: theme.card,
            },
            locked && { opacity: 0.9 },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              { backgroundColor: soundItem.color },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: iconRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name={soundItem.icon} size={24} color="white" />
            </Animated.View>
          </Animated.View>

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

          {locked ? (
            <View style={{ padding: 8 }}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={theme.textSecondary}
              />
            </View>
          ) : isActive ? (
            <Animated.View
              style={[
                styles.playingIndicator,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Ionicons
                name={isPlaying ? "volume-high" : "volume-mute"}
                size={20}
                color={soundItem.color}
              />
            </Animated.View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>White Noise</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Relax, Focus, Sleep
        </Text>
        <Text
          style={[
            styles.backgroundPlayIndicator,
            { color: backgroundPlayEnabled ? theme.success : theme.textMuted },
          ]}
        >
          {backgroundPlayEnabled
            ? "Background Play Enabled"
            : "Background Play Disabled"}
        </Text>
      </View>

      <View style={styles.soundsList}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {WHITE_NOISE_SOUNDS.map((soundItem, index) => (
            <SoundCard key={soundItem.id} soundItem={soundItem} index={index} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {activeSounds.size > 0 && (
        <>
          {/* Overlay */}
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            {/* BlurView is web-compatible; if you ever hit issues, fallback to a View */}
            <BlurView
              intensity={60}
              tint={themeMode === "dark" ? "dark" : "light"}
              style={styles.blurView}
            >
              <TouchableOpacity
                style={styles.overlayTouchable}
                onPress={handleOverlayPress}
                activeOpacity={1}
              />
            </BlurView>
          </Animated.View>

          <Animated.View
            style={[
              styles.playerControls,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                transform: [{ translateY: playerSlide }],
              },
            ]}
          >
            <View style={styles.nowPlaying}>
              <Text
                style={[styles.nowPlayingText, { color: theme.textSecondary }]}
              >
                Now Playing{" "}
                {activeSounds.size > 1 ? `(${activeSounds.size} sounds)` : ""}
              </Text>
              <Text style={[styles.currentSoundName, { color: theme.text }]}>
                {getCurrentSoundsDisplay()}
              </Text>
              {timerMinutes !== null && (
                <View style={styles.timerDisplay}>
                  <Ionicons
                    name="timer-outline"
                    size={16}
                    color={theme.primary}
                  />
                  <Text style={[styles.timerText, { color: theme.primary }]}>
                    {formatTime(timerSeconds)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.controlsRow}>
              <AnimatedControlButton
                onPress={() => setMixerModalVisible(true)}
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
                onPress={toggleGlobalMute}
                iconName={globalMuted ? "volume-mute" : "volume-high"}
                style={{
                  backgroundColor: globalMuted ? theme.error : theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                iconColor={globalMuted ? "white" : theme.text}
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
        onClose={() => setMixerModalVisible(false)}
        theme={theme}
        activeSounds={activeSounds}
        onToggleSound={toggleSoundInMixer}
        onVolumeChange={changeSoundVolume}
        isPro={pro}
        onOpenPaywall={() => setPaywallOpen(true)}
      />

      {/* Timer Modal */}
      <TimerModal
        visible={timerModalVisible}
        onClose={() => setTimerModalVisible(false)}
        onSetTimer={handleSetTimer}
        theme={theme}
        currentTimer={timerMinutes}
      />

      {/* Paywall */}
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={() => setPro(true)}
        theme={theme}
      />
    </SafeAreaView>
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
  header: { padding: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 8 },
  backgroundPlayIndicator: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  soundsList: { flex: 1, padding: 20 },
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
  blurView: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  overlayTouchable: { flex: 1 },
  playerControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 100,
    borderTopWidth: 1,
    elevation: 8,
    zIndex: 2,
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
    marginBottom: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
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
});
