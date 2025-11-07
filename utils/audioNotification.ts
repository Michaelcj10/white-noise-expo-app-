// utils/audioNotification.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let currentNotificationId: string | null = null;

export const setupAudioNotifications = async () => {
  // Request permission for notifications (required for Android)
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Notification permission not granted");
    return false;
  }

  // Create notification channel for Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("audio-playback", {
      name: "Audio Playback",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  return true;
};

export const showPlayingNotification = async (soundName: string) => {
  try {
    // Cancel existing notification if any
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    }

    // Show new persistent notification
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "White Noise - Now Playing",
        body: `${soundName}`,
        sound: undefined, // No sound
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true, // Makes it persistent
        badge: 0,
        data: { type: "audio-playback" },
      },
      trigger: null, // Show immediately
    });

    console.log("📢 Notification shown for:", soundName);
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

export const updatePlayingNotification = async (soundName: string) => {
  // Same as show, updates existing notification
  await showPlayingNotification(soundName);
};

export const hidePlayingNotification = async () => {
  try {
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
      console.log("📢 Notification dismissed");
    }
  } catch (error) {
    console.error("Error hiding notification:", error);
  }
};

export const clearAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    currentNotificationId = null;
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
};
