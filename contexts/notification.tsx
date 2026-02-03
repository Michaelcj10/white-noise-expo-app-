import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "./themecontext";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onDismiss?: () => void;
}

interface NotificationContextType {
  showNotification: (
    title: string,
    message: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const notificationIdCounter = React.useRef(0);
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
  ) => {
    const id = notificationIdCounter.current++;

    setNotification({
      id,
      title,
      message,
      type,
    });

    // Animate in
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  return (
    <NotificationContext.Provider
      value={{ showNotification, dismissNotification }}
    >
      {children}
      {notification && (
        <NotificationModal
          notification={notification}
          onDismiss={dismissNotification}
          scaleAnim={scaleAnim}
          opacityAnim={opacityAnim}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

interface NotificationModalProps {
  notification: Notification;
  onDismiss: () => void;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
}

function NotificationModal({
  notification,
  onDismiss,
  scaleAnim,
  opacityAnim,
}: NotificationModalProps) {
  const { theme } = useTheme();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: "#10b981" };
      case "error":
        return { name: "close-circle", color: "#ef4444" };
      case "warning":
        return { name: "warning", color: "#f59e0b" };
      default:
        return { name: "information-circle", color: "#3b82f6" };
    }
  };

  const icon = getIcon(notification.type);

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={icon.name as any}
              size={48}
              color={icon.color}
              style={styles.icon}
            />

            <Text style={[styles.title, { color: theme.text }]}>
              {notification.title}
            </Text>

            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {notification.message}
            </Text>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={onDismiss}
            >
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    maxWidth: 380,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 140,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
