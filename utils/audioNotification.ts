// utils/audioNotification.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Action identifiers
export const NOTIFICATION_ACTIONS = {
  PAUSE: "pause",
  PLAY: "play",
  STOP: "stop",
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
  try {
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
          identifier: NOTIFICATION_ACTIONS.STOP,
          buttonTitle: "Stop",
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }
  } catch (error) {
    // Gracefully handle category setup errors
    console.log("📢 Unable to setup notification categories:", error);
  }
};

export const setupAudioNotifications = async () => {
  try {
    // Skip notifications on web
    if (Platform.OS === "web") {
      console.log("📢 Notifications not supported on web");
      return false;
    }

    // Request permission for notifications (required for Android)
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log(
        "📢 Notification permission not granted - app will work without notifications"
      );
      return false;
    }

    // Create notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("audio-playback", {
        name: "Audio Playback",
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: null,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableLights: false,
        enableVibrate: false,
        showBadge: false,
      });
    }

    // Setup notification categories with action buttons
    await setupNotificationCategories();

    console.log("📢 Notifications setup successfully");
    return true;
  } catch (error) {
    // Gracefully handle any setup errors
    console.log(
      "📢 Unable to setup notifications (app will continue without them):",
      error
    );
    return false;
  }
};

export const showPlayingNotification = async (
  soundName: string,
  isPaused: boolean = false
) => {
  try {
    // Skip notifications on web
    if (Platform.OS === "web") {
      return;
    }

    // Check if we have notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      // Silently skip - user hasn't granted permission, app continues normally
      return;
    }

    // Cancel existing notification if any
    if (currentNotificationId) {
      try {
        await Notifications.dismissNotificationAsync(currentNotificationId);
      } catch (dismissError) {
        // Ignore dismiss errors, notification might already be gone
        console.log("📢 Previous notification already dismissed");
      }
    }

    // Show new persistent notification with controls
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isPaused ? "Slumbr - Paused" : "Slumbr - Now Playing",
        body: `${soundName}`,
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true,
        badge: 0,
        categoryIdentifier: isPaused ? "playback-paused" : "playback",
        color: "#0A0903", // Brand color for notification
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
    // Gracefully handle notification errors - app continues working
    console.log(
      "📢 Unable to show notification (continuing without it):",
      error
    );
  }
};

export const updatePlayingNotification = async (
  soundName: string,
  isPaused: boolean = false
) => {
  // Skip on web
  if (Platform.OS === "web") {
    return;
  }
  await showPlayingNotification(soundName, isPaused);
};

export const hidePlayingNotification = async () => {
  try {
    // Skip on web
    if (Platform.OS === "web") {
      return;
    }

    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
      console.log("📢 Notification dismissed");
    }
  } catch (error) {
    // Gracefully handle dismiss errors - notification might already be gone
    console.log(
      "📢 Unable to dismiss notification (it may have been dismissed already):",
      error
    );
    currentNotificationId = null; // Clear the ID anyway
  }
};

export const clearAllNotifications = async () => {
  try {
    // Skip on web
    if (Platform.OS === "web") {
      return;
    }

    await Notifications.dismissAllNotificationsAsync();
    currentNotificationId = null;
    console.log("📢 All notifications cleared");
  } catch (error) {
    // Gracefully handle clear errors
    console.log("📢 Unable to clear notifications:", error);
    currentNotificationId = null; // Clear the ID anyway
  }
};
