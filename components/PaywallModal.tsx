import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { useRevenueCat } from "../contexts/revenuecat";
import { useTheme } from "../contexts/themecontext";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { theme } = useTheme();
  const { offerings, purchasePackage, restorePurchases, isPro } =
    useRevenueCat();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setLoading(true);
      await purchasePackage(pkg);
      Alert.alert("Success!", "You now have access to all Pro features!");
      onClose();
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert("Purchase Failed", "Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await restorePurchases();
      Alert.alert("Restored!", "Your purchases have been restored.");
      onClose();
    } catch (error) {
      Alert.alert("Restore Failed", "No purchases found to restore.");
    } finally {
      setLoading(false);
    }
  };

  if (isPro) {
    return null;
  }

  const features = [
    { icon: "musical-notes", text: "Access to all 24 premium sounds" },
    { icon: "cloud-done", text: "Offline mode for all sounds" },
    { icon: "infinite", text: "Unlimited sound mixing" },
    { icon: "timer", text: "Advanced timer options" },
    { icon: "moon", text: "Perfect for sleep and focus" },
    { icon: "close-circle", text: "No ads ever" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.border }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badge}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Upgrade to Pro
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Unlock all premium sounds and features
              </Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name={feature.icon as any}
                      size={24}
                      color="#8b5cf6"
                    />
                  </View>
                  <Text style={[styles.featureText, { color: theme.text }]}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            {offerings?.availablePackages && (
              <View style={styles.pricing}>
                {offerings.availablePackages.map((pkg: PurchasesPackage) => (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.priceButton, { backgroundColor: "#8b5cf6" }]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text style={styles.priceTitle}>
                          {pkg.product.title}
                        </Text>
                        <Text style={styles.priceAmount}>
                          {pkg.product.priceString}
                          {pkg.packageType === "MONTHLY" && "/month"}
                          {pkg.packageType === "ANNUAL" && "/year"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!offerings?.availablePackages && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text
                  style={[styles.loadingText, { color: theme.textSecondary }]}
                >
                  Loading offers...
                </Text>
              </View>
            )}

            {/* Restore button */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading}
            >
              <Text style={[styles.restoreText, { color: theme.text }]}>
                Restore Purchases
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={[styles.terms, { color: theme.textSecondary }]}>
              Auto-renewing subscription. Cancel anytime. Terms apply.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 16,
    maxHeight: "90%",
    borderTopWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  features: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  pricing: {
    gap: 12,
    marginBottom: 24,
  },
  priceButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  priceTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceAmount: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  restoreButton: {
    padding: 16,
    alignItems: "center",
  },
  restoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
  terms: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
});
