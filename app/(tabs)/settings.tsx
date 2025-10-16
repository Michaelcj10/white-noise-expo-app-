// app/(tabs)/settings.tsx
import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { useBackgroundPlay } from "@/contexts/backgroundplay";
import { useTheme } from "@/contexts/themecontext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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
import { Paywall } from ".";

/* ---------- Storage (web-safe) ---------- */
const ENTITLEMENT_KEY = "entitlement_pro";

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

  const [favoriteSoundId, setFavoriteSoundId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pro, setPro] = useState(false);

  async function iapIsPro(): Promise<boolean> {
    const v = await Storage.getItem(ENTITLEMENT_KEY);
    return v === "true";
  }

  // Load saved favourite + pro entitlement
  useEffect(() => {
    (async () => {
      const storedId = await Storage.getItem("favorite_sound_id");
      if (storedId) setFavoriteSoundId(storedId);
      const entitled = await iapIsPro();
      setPro(entitled);
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
    Alert.alert(
      "About White Noise",
      "Version 1.0.0\n\nA simple and elegant white noise app to help you focus, relax, and sleep better.",
      [{ text: "OK" }]
    );
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
      setPaywallVisible(true);
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

      {/* Paywall Modal */}
      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUnlock={() => setPro(true)}
        theme={theme}
      />
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
});
