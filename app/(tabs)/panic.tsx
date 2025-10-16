// app/(tabs)/panic.tsx
import React from "react";
import { View } from "react-native";

// This screen is never shown - the tab press is intercepted
// This file just needs to exist for the Tab.Screen to work
export default function PanicPlaceholder() {
  return <View />;
}
