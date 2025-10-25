// app/(tabs)/settings.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useBackgroundPlay } from "@/contexts/backgroundplay";
import { useScroll } from "@/contexts/scroll";
import { useTheme } from "@/contexts/themecontext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
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
import { SafeAreaView } from "react-native-safe-area-context";

/** Web + native storage shim */
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

const FAVORITES_KEY = "favorite_sound_ids";

export default function SettingsScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { backgroundPlayEnabled, setBackgroundPlayEnabled } =
    useBackgroundPlay();
  const { setScrollViewRef } = useScroll();
  const scrollViewRef = useRef<ScrollView>(null);

  const [favoriteSoundId, setFavoriteSoundId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [pro, setPro] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [confirmClearQuickPlayVisible, setConfirmClearQuickPlayVisible] =
    useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedSoundForConfirm, setSelectedSoundForConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [confirmClearFavoritesVisible, setConfirmClearFavoritesVisible] =
    useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState({
    title: "",
    message: "",
    icon: "information-circle" as keyof typeof Ionicons.glyphMap,
  });

  // Load saved favourite + pro entitlement + favorites count
  useEffect(() => {
    (async () => {
      const storedId = await Storage.getItem("favorite_sound_id");
      if (storedId) setFavoriteSoundId(storedId);

      const storedFavorites = await Storage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const ids = JSON.parse(storedFavorites);
        setFavoritesCount(ids.length);
      }
    })();
  }, []);

  // Reload favorites count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const storedFavorites = await Storage.getItem(FAVORITES_KEY);
        if (storedFavorites) {
          const ids = JSON.parse(storedFavorites);
          setFavoritesCount(ids.length);
        } else {
          setFavoritesCount(0);
        }
      })();
    }, [])
  );

  const SettingItem = ({
    icon,
    title,
    description,
    hasSwitch = false,
    switchValue = false,
    onSwitchChange,
    onPress,
    showArrow = false,
    color = theme.primary,
  }: any) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>
          {title}
        </Text>
        {description && (
          <Text
            style={[styles.settingDescription, { color: theme.textSecondary }]}
          >
            {description}
          </Text>
        )}
      </View>
      {hasSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
          thumbColor={switchValue ? "#ffffff" : theme.switchThumbOff}
        />
      )}
      {showArrow && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.sectionHeader }]}>
      {title}
    </Text>
  );

  const handleBackgroundPlayToggle = (enabled: boolean) => {
    setBackgroundPlayEnabled(enabled);
    if (enabled) {
      setInfoModalContent({
        title: "Background Play Enabled",
        message:
          "White noise sounds will now continue playing when you minimize the app or lock your device.",
        icon: "checkmark-circle",
      });
      setInfoModalVisible(true);
    } else {
      setInfoModalContent({
        title: "Background Play Disabled",
        message:
          "Audio will now stop when you minimize the app or lock your device.",
        icon: "information-circle",
      });
      setInfoModalVisible(true);
    }
  };

  const handleAboutPress = () => {
    setAboutModalVisible(true);
  };

  const handleRatePress = () => {
    // Could implement custom modal here too if desired
    Alert.alert("Rate App", "Would you like to rate our app?", [
      { text: "Later", style: "cancel" },
      { text: "Rate Now", onPress: () => console.log("Open store link") },
    ]);
  };

  const handleSelectFavorite = async (id: number) => {
    const sound = WHITE_NOISE_SOUNDS.find((s) => s.id === id);
    if (!sound) return;

    // Check entitlement if premium
    if (sound.premium && !pro) {
      setModalVisible(false);
      return;
    }

    setModalVisible(false);
    setSelectedSoundForConfirm({ id, name: sound.name });
  };

  const confirmQuickPlaySelection = async () => {
    if (!selectedSoundForConfirm) return;

    await Storage.setItem(
      "favorite_sound_id",
      String(selectedSoundForConfirm.id)
    );
    setFavoriteSoundId(String(selectedSoundForConfirm.id));
    setSelectedSoundForConfirm(null);

    // Show success message
    setSuccessMessage(
      `${selectedSoundForConfirm.name} is now your quick play sound.`
    );
    setSuccessMessageVisible(true);
    setTimeout(() => setSuccessMessageVisible(false), 2500);
  };

  const confirmClearQuickPlay = async () => {
    await Storage.setItem("favorite_sound_id", "");
    setFavoriteSoundId(null);
    setConfirmClearQuickPlayVisible(false);

    // Show success message
    setSuccessMessage("Quick play sound has been cleared.");
    setSuccessMessageVisible(true);
    setTimeout(() => setSuccessMessageVisible(false), 2500);
  };

  const handleClearFavorites = () => {
    if (favoritesCount === 0) {
      setInfoModalContent({
        title: "No Favorites",
        message: "You don't have any favorite sounds yet.",
        icon: "heart-outline",
      });
      setInfoModalVisible(true);
      return;
    }

    setConfirmClearFavoritesVisible(true);
  };

  const confirmClearFavorites = async () => {
    await Storage.setItem(FAVORITES_KEY, JSON.stringify([]));
    setFavoritesCount(0);
    setConfirmClearFavoritesVisible(false);

    setSuccessMessage("All favorites have been cleared.");
    setSuccessMessageVisible(true);
    setTimeout(() => setSuccessMessageVisible(false), 2500);
  };

  const renderSoundItem = ({ item }: any) => {
    const isSelected = String(item.id) === favoriteSoundId;
    return (
      <TouchableOpacity
        style={[
          styles.soundItem,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isSelected && { borderColor: theme.primary },
        ]}
        onPress={() => handleSelectFavorite(item.id)}
      >
        <View style={[styles.soundIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.soundTitle, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.soundDesc, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
        )}
        {item.premium && !pro && (
          <Ionicons name="lock-closed" size={20} color={theme.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Customize your experience
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        ref={(ref) => {
          scrollViewRef.current = ref;
          setScrollViewRef("settings", ref);
        }}
      >
        <SectionHeader title="Audio Settings" />
        <SettingItem
          icon="volume-high"
          title="Background Playback"
          description={
            backgroundPlayEnabled
              ? "Audio will continue when app is minimized"
              : "Audio will stop when app is minimized"
          }
          hasSwitch={true}
          switchValue={backgroundPlayEnabled}
          onSwitchChange={handleBackgroundPlayToggle}
          color={backgroundPlayEnabled ? theme.success : theme.surface}
        />

        <SectionHeader title="App Settings" />
        <SettingItem
          icon={themeMode === "dark" ? "sunny" : "moon"}
          title="Dark Mode"
          description={`Currently using ${themeMode} theme`}
          hasSwitch={true}
          switchValue={themeMode === "dark"}
          onSwitchChange={toggleTheme}
          color={theme.primary}
        />

        <SettingItem
          icon="flash"
          title="Quick Play Sound"
          description={
            favoriteSoundId
              ? `Current: ${
                  WHITE_NOISE_SOUNDS.find(
                    (s) => String(s.id) === favoriteSoundId
                  )?.name
                }`
              : "No quick play sound selected"
          }
          onPress={() => setModalVisible(true)}
          showArrow={true}
          color={theme.forest}
        />

        <SettingItem
          icon="trash"
          title="Clear Favorites"
          description={
            favoritesCount > 0
              ? `${favoritesCount} favorite sound${
                  favoritesCount === 1 ? "" : "s"
                }`
              : "No favorites to clear"
          }
          onPress={handleClearFavorites}
          showArrow={true}
          color={theme.error}
        />

        <SectionHeader title="Support" />
        <SettingItem
          icon="star"
          title="Rate App"
          description="Help us improve by rating the app"
          onPress={handleRatePress}
          showArrow={true}
          color={theme.ocean}
        />
        <SettingItem
          icon="mail"
          title="Contact Us"
          description="Get help or send feedback"
          onPress={() => setContactModalVisible(true)}
          showArrow={true}
          color={theme.success}
        />
        <SettingItem
          icon="information-circle"
          title="About"
          description="App version and information"
          onPress={handleAboutPress}
          showArrow={true}
          color={theme.secondary}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Slumbr v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Quick Play Sound Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Select Quick Play Sound
            </Text>
          </View>
          {favoriteSoundId && (
            <TouchableOpacity
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                padding: 12,
                backgroundColor: theme.error,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setModalVisible(false);
                setConfirmClearQuickPlayVisible(true);
              }}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text
                style={{
                  color: "white",
                  marginLeft: 8,
                  fontWeight: "600",
                }}
              >
                Clear Quick Play
              </Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={WHITE_NOISE_SOUNDS}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSoundItem}
            contentContainerStyle={{ padding: 16 }}
          />
          <TouchableOpacity
            style={{ padding: 16, alignItems: "center" }}
            onPress={() => setModalVisible(false)}
          >
            <Text style={{ color: theme.primary }}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutModalVisible} animationType="fade">
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>About</Text>
          </View>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.aboutContent}>
              <Ionicons
                name="musical-notes"
                size={80}
                color={theme.primary}
                style={styles.aboutIcon}
              />
              <Text style={[styles.aboutTitle, { color: theme.text }]}>
                White Noise Expo
              </Text>
              <Text
                style={[styles.aboutVersion, { color: theme.textSecondary }]}
              >
                Version 1.0.0
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Welcome to White Noise Expo, your ultimate companion for
                relaxation, focus, and better sleep. Our app offers a curated
                collection of high-quality white noise sounds designed to help
                you create the perfect ambiance for any moment.
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Whether you&apos;re working, studying, meditating, or winding
                down for the night, our diverse range of sounds - from gentle
                rain to ocean waves, forest ambiances to urban rhythms -
                provides the ideal backdrop for your needs.
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Key Features: • Extensive library of premium white noise sounds
                • Customizable playback options • Background play support • Dark
                mode for comfortable viewing • Favorite sound selection •
                Ad-free experience with Pro upgrade
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                We&apos;re committed to helping you find your perfect
                soundscape. Thank you for choosing White Noise Expo!
              </Text>
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.primary }]}
            onPress={() => setAboutModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={contactModalVisible} animationType="fade">
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Contact Us
            </Text>
          </View>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.aboutContent}>
              <Ionicons
                name="mail"
                size={80}
                color={theme.primary}
                style={styles.aboutIcon}
              />
              <Text style={[styles.aboutTitle, { color: theme.text }]}>
                Get in Touch
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                We&apos;re here to help! Whether you have questions, feedback,
                or need support, don&apos;t hesitate to reach out.
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Email: support@whitenoise.app
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Response Time: We typically respond within 24 hours.
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                For faster support, please include your device type, app
                version, and a detailed description of your issue or question.
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.text }]}>
                Thank you for using White Noise Expo. Your feedback helps us
                improve the app for everyone!
              </Text>
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.primary }]}
            onPress={() => setContactModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Confirm Quick Play Selection Modal */}
      <Modal
        visible={selectedSoundForConfirm !== null}
        animationType="fade"
        transparent
      >
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
                <Ionicons name="flash" size={32} color={theme.primary} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Set Quick Play Sound?
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                {selectedSoundForConfirm?.name} will be your quick play sound
                for instant access.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={confirmQuickPlaySelection}
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
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedSoundForConfirm(null)}
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

      {/* Confirm Clear Quick Play Modal */}
      <Modal
        visible={confirmClearQuickPlayVisible}
        animationType="fade"
        transparent
      >
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
                  backgroundColor: theme.error + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="trash" size={32} color={theme.error} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Clear Quick Play?
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                Are you sure you want to clear your quick play sound?
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={confirmClearQuickPlay}
                style={{
                  backgroundColor: theme.error,
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
                  Clear
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirmClearQuickPlayVisible(false)}
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

      {/* Success Message Modal */}
      <Modal visible={successMessageVisible} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.success + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={theme.success}
              />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                color: theme.text,
                fontWeight: "600",
              }}
            >
              {successMessage}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Confirm Clear Favorites Modal */}
      <Modal
        visible={confirmClearFavoritesVisible}
        animationType="fade"
        transparent
      >
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
                  backgroundColor: theme.error + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="trash" size={32} color={theme.error} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Clear All Favorites?
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                Are you sure you want to clear all {favoritesCount} favorite
                sound{favoritesCount === 1 ? "" : "s"}?
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={confirmClearFavorites}
                style={{
                  backgroundColor: theme.error,
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
                  Clear All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirmClearFavoritesVisible(false)}
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

      {/* Info Modal (for background play and no favorites messages) */}
      <Modal visible={infoModalVisible} animationType="fade" transparent>
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
                <Ionicons
                  name={infoModalContent.icon}
                  size={32}
                  color={theme.primary}
                />
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
                {infoModalContent.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                {infoModalContent.message}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setInfoModalVisible(false)}
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
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  settingDescription: { fontSize: 14, lineHeight: 18 },
  footer: { alignItems: "center", paddingVertical: 40, paddingBottom: 100 },
  footerText: { fontSize: 16, fontWeight: "600" },
  footerSubText: { fontSize: 14, marginTop: 4 },

  soundItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  soundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  soundTitle: { fontSize: 16, fontWeight: "600" },
  soundDesc: { fontSize: 14 },

  aboutContent: { alignItems: "center", paddingVertical: 20 },
  aboutIcon: { marginBottom: 20 },
  aboutTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  aboutVersion: { fontSize: 16, marginBottom: 20 },
  aboutDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  closeButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
