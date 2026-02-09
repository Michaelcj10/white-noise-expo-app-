import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ---------- Types ---------- */
export interface SoundItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  premium: boolean;
  isLocal?: boolean;
  category: string;
  file?: any;
  url?: string;
}

export interface Theme {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  error: string;
  [key: string]: string;
}

export interface SoundCardProps {
  soundItem: SoundItem;
  isActive: boolean;
  isLoading: boolean;
  isFavorite: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  isQuickPlayActive: boolean;
  isPro: boolean;
  theme: Theme;
  themeMode: "light" | "dark";
  scaledNameSize: number;
  scaledDescSize: number;
  onPress: (soundItem: SoundItem) => void;
  onFavorite: (soundId: number) => void;
  onDownload: (soundItem: SoundItem) => void;
}

/* ---------- Component ---------- */
export const SoundCard = React.memo(
  ({
    soundItem,
    isActive,
    isLoading,
    isFavorite,
    isDownloaded,
    isDownloading,
    isQuickPlayActive,
    isPro,
    theme,
    themeMode,
    scaledNameSize,
    scaledDescSize,
    onPress,
    onFavorite,
    onDownload,
  }: SoundCardProps) => {
    // Animation refs
    const cardScale = useRef(new Animated.Value(1)).current;
    const heartScale = useRef(new Animated.Value(1)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;

    // Pulse animation for active sounds
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

    // Handlers
    const handlePress = useCallback(() => {
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

      onPress(soundItem);
    }, [soundItem, cardScale, onPress]);

    const handleHeartPress = useCallback(
      (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.4,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 0.95,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(heartScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        onFavorite(soundItem.id);
      },
      [soundItem.id, heartScale, onFavorite],
    );

    const handleDownloadPress = useCallback(
      (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDownload(soundItem);
      },
      [soundItem, onDownload],
    );

    // Derived values
    const showDownloadButton =
      !soundItem.isLocal && !isDownloaded && (isPro || !soundItem.premium);
    const showProBadge = soundItem.premium && !isPro;

    return (
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
        <TouchableOpacity
          style={[
            styles.soundCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isActive && {
              borderColor: theme.primary,
              backgroundColor: theme.card,
              borderWidth: 2.5,
            },
            isQuickPlayActive && {
              borderColor: "#3b82f6",
              backgroundColor: "#3b82f620",
              borderWidth: 2.5,
            },
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {/* Icon container with pulse animation */}
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
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <View
                  style={[
                    styles.loadingBadge,
                    { backgroundColor: soundItem.color },
                  ]}
                >
                  <Text style={styles.loadingText}>...</Text>
                </View>
              </View>
            ) : (
              <Ionicons
                name={soundItem.icon as any}
                size={24}
                color={themeMode === "light" ? "#2c2622" : "white"}
              />
            )}
          </Animated.View>

          {/* Sound info */}
          <View style={styles.soundInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.soundName,
                  { color: theme.text, fontSize: scaledNameSize },
                ]}
              >
                {soundItem.name}
              </Text>
            </View>
            <Text
              style={[
                styles.soundDescription,
                {
                  color: theme.textSecondary,
                  fontSize: scaledDescSize,
                  opacity: 0.95,
                },
              ]}
            >
              {soundItem.description}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {/* Download button */}
            {showDownloadButton && (
              <TouchableOpacity
                onPress={handleDownloadPress}
                style={styles.downloadButton}
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

            {/* Pro badge or favorite button */}
            {showProBadge ? (
              <View
                style={[
                  styles.proBadge,
                  {
                    backgroundColor:
                      themeMode === "light" ? "#9b8fa8" : "#8b5cf6",
                  },
                ]}
              >
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleHeartPress}
                style={styles.favoriteButton}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={22}
                    color={isFavorite ? "#FF6B6B" : theme.textSecondary}
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
  // Custom comparison function for optimal re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.soundItem === nextProps.soundItem &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.isFavorite === nextProps.isFavorite &&
      prevProps.isDownloaded === nextProps.isDownloaded &&
      prevProps.isDownloading === nextProps.isDownloading &&
      prevProps.isQuickPlayActive === nextProps.isQuickPlayActive &&
      prevProps.isPro === nextProps.isPro &&
      prevProps.theme === nextProps.theme &&
      prevProps.themeMode === nextProps.themeMode &&
      prevProps.scaledNameSize === nextProps.scaledNameSize &&
      prevProps.scaledDescSize === nextProps.scaledDescSize
      // Note: callbacks (onPress, onFavorite, onDownload) are intentionally
      // excluded - they should be memoized in the parent with useCallback
    );
  },
);

SoundCard.displayName = "SoundCard";

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
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
  loadingContainer: {
    position: "relative",
  },
  loadingBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  loadingText: {
    color: "white",
    fontSize: 8,
    fontWeight: "600",
  },
  soundInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  soundName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  soundDescription: {
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadButton: {
    padding: 8,
    position: "relative",
  },
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
  favoriteButton: {
    padding: 8,
  },
});
