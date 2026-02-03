import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
  opacity: Animated.Value;
  translateY: Animated.Value;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number,
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);
  const insets = useSafeAreaInsets();

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    duration: number = 3000,
  ) => {
    const id = toastIdCounter.current++;
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(20);

    const newToast: Toast = {
      id,
      message,
      type,
      opacity,
      translateY,
    };

    setToasts((prev) => [...prev, newToast]);

    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto remove after duration
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      });
    }, duration);
  };

  const getColors = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return { bg: "#10b981", icon: "checkmark-circle" as const };
      case "error":
        return { bg: "#ef4444", icon: "close-circle" as const };
      case "warning":
        return { bg: "#f59e0b", icon: "warning" as const };
      default:
        return { bg: "#3b82f6", icon: "information-circle" as const };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[
          styles.container,
          { bottom: insets.bottom + 20, paddingHorizontal: insets.left + 16 },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => {
          const colors = getColors(toast.type);
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                {
                  opacity: toast.opacity,
                  transform: [{ translateY: toast.translateY }],
                },
              ]}
              pointerEvents="auto"
            >
              <View
                style={[styles.toastContent, { backgroundColor: colors.bg }]}
              >
                <Ionicons name={colors.icon} size={20} color="white" />
                <Text style={styles.toastText}>{toast.message}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toast: {
    marginBottom: 12,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 16,
    gap: 12,
  },
  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
