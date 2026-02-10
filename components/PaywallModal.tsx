import { useNotification } from "@/contexts/notification";
import { Analytics } from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  const { showNotification } = useNotification();
  const { isPro, offerings, purchasePackage, restorePurchases } =
    useRevenueCat();
  const [loading, setLoading] = useState(false);

  // Track when paywall is viewed
  useEffect(() => {
    if (visible) {
      Analytics.trackPaywallViewed("banner");
    }
  }, [visible]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setLoading(true);
    Analytics.trackPurchaseStarted(pkg.identifier, pkg.product.priceString);
    const result = await purchasePackage(pkg);
    setLoading(false);

    if (result.success) {
      Analytics.trackPurchaseCompleted(pkg.identifier, pkg.product.priceString);
      showNotification(
        "Welcome to Pro!",
        "You now have access to all premium sounds, features, and an ad-free experience!",
        "success",
      );
      onClose();
    } else {
      Analytics.trackPurchaseFailed(pkg.identifier, "Purchase failed");
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    Analytics.trackRestorePurchases(true);
    const result = await restorePurchases();
    setLoading(false);

    if (result.success) {
      onClose();
    }
  };

  const handleClose = () => {
    Analytics.trackPaywallDismissed();
    onClose();
  }; // Don't show paywall if already pro
  if (isPro) {
    return null;
  }

  const features = [
    {
      icon: "musical-notes",
      text: "Access to all 44 premium sounds",
    },
    {
      icon: "infinite",
      text: "Unlimited offline sounds (free users: 1 only)",
    },
    {
      icon: "layers",
      text: "Sound mixing offline (free users: streaming only)",
    },
    {
      icon: "wifi-off",
      text: "Auto-save favorites for offline use",
    },
    {
      icon: "volume-mute",
      text: "No ads, ever",
    },
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
            onPress={handleClose}
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
                Upgrade to Drowse Pro
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Save unlimited sounds offline • Advanced mixing • No ads
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
              <View style={styles.pricingContainer}>
                {/* Main Pricing: Monthly and Yearly */}
                <View style={styles.pricing}>
                  {offerings.availablePackages
                    .filter(
                      (pkg) =>
                        pkg.packageType === "MONTHLY" ||
                        pkg.packageType === "ANNUAL",
                    )
                    .sort((a, b) => {
                      // Show ANNUAL first, then MONTHLY
                      if (a.packageType === "ANNUAL") return -1;
                      if (b.packageType === "ANNUAL") return 1;
                      return 0;
                    })
                    .map((pkg) => {
                      const isAnnual = pkg.packageType === "ANNUAL";
                      // Calculate savings for yearly
                      const monthlyCost =
                        offerings.availablePackages.find(
                          (p) => p.packageType === "MONTHLY",
                        )?.product.price || 0;
                      const yearlyCost = pkg.product.price || 0;
                      const monthlySavings = (
                        ((monthlyCost * 12 - yearlyCost) / (monthlyCost * 12)) *
                        100
                      ).toFixed(0);

                      return (
                        <TouchableOpacity
                          key={pkg.identifier}
                          style={[
                            styles.priceButton,
                            { backgroundColor: theme.primary },
                            isAnnual && styles.bestValueButton,
                          ]}
                          onPress={() => handlePurchase(pkg)}
                          disabled={loading}
                        >
                          {isAnnual && (
                            <View style={styles.savingsBadge}>
                              <Text style={styles.savingsText}>
                                Save {monthlySavings}%
                              </Text>
                            </View>
                          )}
                          {loading ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <Text style={styles.priceTitle}>
                                {isAnnual ? "Yearly" : "Monthly"}
                              </Text>
                              <Text style={styles.priceAmount}>
                                {pkg.product.priceString}
                              </Text>
                              <Text style={styles.priceSubtext}>
                                {isAnnual
                                  ? "per year"
                                  : `${(pkg.product.price / 12).toFixed(
                                      2,
                                    )}$/month`}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>

                {/* Lifetime Option (Secondary CTA - Slightly Hidden) */}
                {offerings.availablePackages.find(
                  (pkg) => pkg.packageType === "LIFETIME",
                ) && (
                  <View style={styles.lifetimeSection}>
                    <Text
                      style={[
                        styles.lifetimeLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Prefer to own it?
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.lifetimeButton,
                        { borderColor: theme.primary },
                      ]}
                      onPress={() =>
                        handlePurchase(
                          offerings.availablePackages.find(
                            (pkg) => pkg.packageType === "LIFETIME",
                          )!,
                        )
                      }
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={theme.primary} />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.lifetimeTitle,
                              { color: theme.primary },
                            ]}
                          >
                            Lifetime Access
                          </Text>
                          <Text
                            style={[
                              styles.lifetimePrice,
                              { color: theme.primary },
                            ]}
                          >
                            {
                              offerings.availablePackages.find(
                                (pkg) => pkg.packageType === "LIFETIME",
                              )?.product.priceString
                            }
                            {" one-time"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
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
  pricingContainer: {
    marginBottom: 16,
  },
  priceButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  bestValueButton: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    right: 10,
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: "white",
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
    fontSize: 28,
    fontWeight: "bold",
  },
  priceSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  // Lifetime section styles
  lifetimeSection: {
    alignItems: "center",
    gap: 8,
  },
  lifetimeLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  lifetimeButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  lifetimeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  lifetimePrice: {
    fontSize: 14,
    fontWeight: "500",
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
