// utils/audioNotification.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Action identifiers
export const NOTIFICATION_ACTIONS = {
  PAUSE: "pause",
  PLAY: "play",
  STOP: "stop",
  NEXT: "next",
};

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

// Setup notification categories with actions (buttons)
const setupNotificationCategories = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationCategoryAsync("playback", [
      {
        identifier: NOTIFICATION_ACTIONS.PAUSE,
        buttonTitle: "Pause",
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.NEXT,
        buttonTitle: "Next",
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.STOP,
        buttonTitle: "Stop",
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync("playback-paused", [
      {
        identifier: NOTIFICATION_ACTIONS.PLAY,
        buttonTitle: "Play",
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.NEXT,
        buttonTitle: "Next",
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.STOP,
        buttonTitle: "Stop",
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }
};

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
      enableLights: false,
      enableVibrate: false,
    });
  }

  // Setup notification categories with action buttons
  await setupNotificationCategories();

  return true;
};

export const showPlayingNotification = async (
  soundName: string,
  isPaused: boolean = false
) => {
  try {
    // Cancel existing notification if any
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    }

    // Show new persistent notification with controls
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isPaused ? "White Noise - Paused" : "White Noise - Now Playing",
        body: `${soundName}`,
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true,
        badge: 0,
        categoryIdentifier: isPaused ? "playback-paused" : "playback",
        data: {
          type: "audio-playback",
          soundName,
          isPaused,
        },
      },
      trigger: null,
    });

    console.log(
      "📢 Notification shown for:",
      soundName,
      isPaused ? "(Paused)" : ""
    );
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

export const updatePlayingNotification = async (
  soundName: string,
  isPaused: boolean = false
) => {
  await showPlayingNotification(soundName, isPaused);
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
