import { WHITE_NOISE_SOUNDS } from "@/constants/sound";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const Storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
};

export default function SelectFavoriteScreen({ navigation }: any) {
  const handleSelect = async (id: number) => {
    await Storage.setItem("favorite_sound_id", String(id));
    Alert.alert("Favourite Set", "This sound is now your panic button sound.");
    navigation.goBack();
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelect(item.id)}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={WHITE_NOISE_SOUNDS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 14, color: "#666" },
  separator: { height: 1, backgroundColor: "#eee" },
});
