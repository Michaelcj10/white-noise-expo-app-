import { useTheme } from "@/contexts/themecontext";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.surface,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme.card,
            opacity,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// Skeleton card for sound items
export const SoundCardSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: theme.card,
      }}
    >
      <ShimmerLoader width={50} height={50} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <ShimmerLoader width="60%" height={16} borderRadius={4} />
        <View style={{ height: 8 }} />
        <ShimmerLoader width="40%" height={12} borderRadius={4} />
      </View>
      <ShimmerLoader width={40} height={40} borderRadius={20} />
    </View>
  );
};
