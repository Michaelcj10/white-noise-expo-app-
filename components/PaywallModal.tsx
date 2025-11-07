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
  const { isPro, offerings, purchasePackage, restorePurchases } =
    useRevenueCat();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setLoading(true);
    const result = await purchasePackage(pkg);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        "Welcome to Slumbr Pro!",
        "You now have access to all premium sounds, features, and a completely ad-free experience!"
      );
      onClose();
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const result = await restorePurchases();
    setLoading(false);

    if (result.success) {
      onClose();
    }
  };

  // Don't show paywall if already pro
  if (isPro) {
    return null;
  }

  const features = [
    {
      icon: "close-circle",
      text: "✨ No ads ever - completely ad-free experience",
    },
    { icon: "musical-notes", text: "Access to all 21 premium sounds" },
    { icon: "infinite", text: "Unlimited sound mixing" },
    { icon: "cloud-done", text: "Offline mode for all sounds" },
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
            disabled={loading}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badge}>
                <Ionicons name="star" size={24} color="#FFD700" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Upgrade to Slumbr Pro
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Ad-free experience • Premium sounds • Advanced features
              </Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name={feature.icon as any}
                      size={20}
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
            {offerings?.availablePackages &&
            offerings.availablePackages.length > 0 ? (
              <View style={styles.pricing}>
                {offerings.availablePackages.map((pkg) => {
                  const isPopular = pkg.packageType === "ANNUAL";
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      style={[
                        styles.priceButton,
                        { backgroundColor: theme.primary },
                        isPopular && styles.popularButton,
                      ]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={loading}
                    >
                      {isPopular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>BEST VALUE</Text>
                        </View>
                      )}
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
                          {pkg.packageType === "LIFETIME" && (
                            <Text style={styles.priceSubtext}>
                              One-time payment
                            </Text>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
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
    padding: 20,
    paddingTop: 12,
    maxHeight: "90%",
    borderTopWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  features: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  pricing: {
    gap: 10,
    marginBottom: 16,
  },
  priceButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  popularButton: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 10,
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "800",
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
  priceSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 4,
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
    marginTop: 8,
    marginBottom: 4,
  },
});
