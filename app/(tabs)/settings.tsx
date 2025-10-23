// app/(tabs)/settings.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useBackgroundPlay } from "@/contexts/backgroundplay";
import { useScroll } from "@/contexts/scroll";
import { useTheme } from "@/contexts/themecontext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
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

export default function SettingsScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { backgroundPlayEnabled, setBackgroundPlayEnabled } =
    useBackgroundPlay();
  const { setScrollViewRef } = useScroll();
  const scrollViewRef = useRef<ScrollView>(null);

  const [favoriteSoundId, setFavoriteSoundId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [pro, setPro] = useState(false);

  // Load saved favourite + pro entitlement
  useEffect(() => {
    (async () => {
      const storedId = await Storage.getItem("favorite_sound_id");
      if (storedId) setFavoriteSoundId(storedId);
    })();
  }, []);

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
      Alert.alert(
        "Background Play Enabled",
        "White noise sounds will now continue playing when you minimize the app or lock your device.",
        [{ text: "Got it!" }]
      );
    } else {
      Alert.alert(
        "Background Play Disabled",
        "Audio will now stop when you minimize the app or lock your device.",
        [{ text: "OK" }]
      );
    }
  };

  const handleAboutPress = () => {
    setAboutModalVisible(true);
  };

  const handleRatePress = () => {
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

    await Storage.setItem("favorite_sound_id", String(id));
    setFavoriteSoundId(String(id));
    setModalVisible(false);
    Alert.alert(
      "Favourite Set",
      `${sound.name} is now your panic button sound.`
    );
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
          icon="heart"
          title="Favourite Sound"
          description={
            favoriteSoundId
              ? `Current: ${
                  WHITE_NOISE_SOUNDS.find(
                    (s) => String(s.id) === favoriteSoundId
                  )?.name
                }`
              : "No favourite selected"
          }
          onPress={() => setModalVisible(true)}
          showArrow={true}
          color={theme.forest}
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
          title="Contact Support"
          description="Get help or send feedback"
          onPress={() => Alert.alert("Contact", "support@whitenoise.app")}
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
            White Noise v1.0.0
          </Text>
          <Text style={[styles.footerSubText, { color: theme.textMuted }]}>
            Made with ❤️ for better sleep
          </Text>
        </View>
      </ScrollView>

      {/* Favourite Sound Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Select Favourite Sound
            </Text>
          </View>
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
