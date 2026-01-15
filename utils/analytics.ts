import { Platform } from "react-native";

// Conditional imports for different platforms
let TrackingTransparency: any;
if (Platform.OS === "ios") {
  // Use native module on iOS only (ATT is iOS-specific)
  TrackingTransparency = require("expo-tracking-transparency");
} else if (Platform.OS === "android") {
  // Use Android mock (ATT not needed on Android)
  TrackingTransparency = require("./trackingTransparency.android");
} else {
  // Use web mock for web platform
  TrackingTransparency = require("./trackingTransparency.web");
}

import { Mixpanel } from "mixpanel-react-native";

class AnalyticsService {
  private mixpanel: Mixpanel | null = null;
  private initialized = false;
  private trackingAllowed = false;

  async requestTrackingPermission(): Promise<boolean> {
    try {
      // Only request on iOS 14.5+
      if (Platform.OS === "ios") {
        const { status } =
          await TrackingTransparency.requestTrackingPermissionsAsync();
        this.trackingAllowed = status === "granted";
        console.log("📊 Tracking permission status:", status);
      } else {
        // On Android and web, default to allowed
        this.trackingAllowed = true;
      }
      return this.trackingAllowed;
    } catch (error) {
      console.error("❌ Failed to request tracking permission:", error);
      this.trackingAllowed = false;
      return false;
    }
  }

  async initialize(apiKey: string) {
    if (this.initialized || !apiKey) {
      console.log("📊 Analytics already initialized or no API key");
      return;
    }

    // Request tracking permission first
    await this.requestTrackingPermission();

    if (!this.trackingAllowed) {
      console.log("📊 Tracking not allowed - analytics disabled");
      return;
    }

    try {
      console.log("📊 Initializing Mixpanel...");
      this.mixpanel = new Mixpanel(apiKey, false);
      await this.mixpanel.init();

      // Set server URL AFTER init
      this.mixpanel.setServerURL("https://api-eu.mixpanel.com");

      this.initialized = true;
      console.log("✅ Mixpanel initialized successfully with EU endpoint");
    } catch (error) {
      console.error("❌ Failed to initialize Mixpanel:", error);
    }
  }

  // User identification
  identifyUser(userId: string, traits?: Record<string, any>) {
    if (!this.mixpanel || !this.trackingAllowed) return;
    this.mixpanel.identify(userId);
    if (traits) {
      this.mixpanel.getPeople().set(traits);
    }
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (!this.mixpanel || !this.trackingAllowed) return;
    this.mixpanel.getPeople().set(properties);
  }

  // Increment user property
  incrementUserProperty(property: string, by: number = 1) {
    if (!this.mixpanel || !this.trackingAllowed) return;
    this.mixpanel.getPeople().increment(property, by);
  }

  // Track events with properties
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.mixpanel || !this.trackingAllowed) {
      console.warn(
        "⚠️ Cannot track event - Mixpanel not initialized or tracking not allowed:",
        eventName
      );
      return;
    }
    console.log("📊 Tracking:", eventName, properties);
    this.mixpanel.track(eventName, {
      platform: Platform.OS,
      ...properties,
    });
  }

  // Sound playback events
  trackSoundPlayed(
    soundId: number,
    soundName: string,
    isPremium: boolean,
    playbackMode: "single" | "mixer"
  ) {
    this.track("Sound Played", {
      sound_id: soundId,
      sound_name: soundName,
      is_premium: isPremium,
      playback_mode: playbackMode,
    });
    this.incrementUserProperty("total_sounds_played");
  }

  trackSoundStopped(soundId: number, soundName: string) {
    this.track("Sound Stopped", {
      sound_id: soundId,
      sound_name: soundName,
    });
  }

  trackSoundPaused() {
    this.track("Sound Paused");
  }

  trackSoundResumed() {
    this.track("Sound Resumed");
  }

  trackAllSoundsStopped(count: number) {
    this.track("All Sounds Stopped", {
      sounds_count: count,
    });
  }

  // Favorite events
  trackFavoriteAdded(soundId: number, soundName: string, isPremium: boolean) {
    this.track("Favorite Added", {
      sound_id: soundId,
      sound_name: soundName,
      is_premium: isPremium,
    });
    this.incrementUserProperty("total_favorites");
  }

  trackFavoriteRemoved(soundId: number, soundName: string) {
    this.track("Favorite Removed", {
      sound_id: soundId,
      sound_name: soundName,
    });
    this.incrementUserProperty("total_favorites", -1);
  }

  // Quick play events
  trackQuickPlayUsed(soundId: number, soundName: string) {
    this.track("Quick Play Used", {
      sound_id: soundId,
      sound_name: soundName,
    });
    this.incrementUserProperty("quick_play_count");
  }

  trackQuickPlaySet(soundId: number, soundName: string) {
    this.track("Quick Play Set", {
      sound_id: soundId,
      sound_name: soundName,
    });
  }

  trackQuickPlayStopped() {
    this.track("Quick Play Stopped");
  }

  // Timer events
  trackTimerSet(minutes: number) {
    this.track("Timer Set", {
      duration_minutes: minutes,
    });
  }

  trackTimerCleared() {
    this.track("Timer Cleared");
  }

  trackTimerCompleted(originalMinutes: number) {
    this.track("Timer Completed", {
      duration_minutes: originalMinutes,
    });
  }

  // Mixer events
  trackMixerOpened(activeSoundsCount: number) {
    this.track("Mixer Opened", {
      active_sounds: activeSoundsCount,
    });
  }

  trackSoundAddedToMix(soundId: number, soundName: string, totalInMix: number) {
    this.track("Sound Added to Mix", {
      sound_id: soundId,
      sound_name: soundName,
      total_sounds_in_mix: totalInMix,
    });
  }

  trackSoundRemovedFromMix(
    soundId: number,
    soundName: string,
    totalInMix: number
  ) {
    this.track("Sound Removed from Mix", {
      sound_id: soundId,
      sound_name: soundName,
      total_sounds_in_mix: totalInMix,
    });
  }

  trackVolumeChanged(soundId: number, soundName: string, volume: number) {
    this.track("Volume Changed", {
      sound_id: soundId,
      sound_name: soundName,
      volume_level: Math.round(volume * 100),
    });
  }

  // Category events
  trackCategorySelected(category: string, soundsCount: number) {
    this.track("Category Selected", {
      category_name: category,
      sounds_in_category: soundsCount,
    });
  }

  // Premium/Paywall events
  trackPaywallViewed(
    trigger:
      | "premium_sound"
      | "mixer"
      | "banner"
      | "settings"
      | "favorite"
      | "offline_limit"
  ) {
    this.track("Paywall Viewed", {
      trigger_source: trigger,
    });
  }

  trackPaywallDismissed() {
    this.track("Paywall Dismissed");
  }

  trackPurchaseStarted(productId: string, price: string) {
    this.track("Purchase Started", {
      product_id: productId,
      price: price,
    });
  }

  trackPurchaseCompleted(productId: string, price: string) {
    this.track("Purchase Completed", {
      product_id: productId,
      price: price,
    });
    this.setUserProperties({
      is_pro: true,
      pro_since: new Date().toISOString(),
    });
  }

  trackPurchaseFailed(productId: string, error: string) {
    this.track("Purchase Failed", {
      product_id: productId,
      error_message: error,
    });
  }

  trackRestorePurchases(success: boolean) {
    this.track("Restore Purchases", {
      success: success,
    });
  }

  // Download events
  trackSoundDownloaded(soundId: number, soundName: string) {
    this.track("Sound Downloaded", {
      sound_id: soundId,
      sound_name: soundName,
    });
    this.incrementUserProperty("total_downloads");
  }

  // Background play events
  trackBackgroundPlayEnabled() {
    this.track("Background Play Enabled");
  }

  trackBackgroundPlayDisabled() {
    this.track("Background Play Disabled");
  }

  // Theme events
  trackThemeChanged(theme: "light" | "dark" | "auto") {
    this.track("Theme Changed", {
      theme_mode: theme,
    });
  }

  // Onboarding events
  trackOnboardingStarted() {
    this.track("Onboarding Started");
  }

  trackOnboardingCompleted() {
    this.track("Onboarding Completed");
    this.setUserProperties({
      onboarded: true,
      onboarded_at: new Date().toISOString(),
    });
  }

  // Session events
  trackAppOpened() {
    this.track("App Opened");
    this.incrementUserProperty("session_count");
  }

  trackAppClosed() {
    this.track("App Closed");
  }

  // Settings events
  trackSettingsOpened() {
    this.track("Settings Opened");
  }

  // Error tracking
  trackError(
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>
  ) {
    this.track("Error Occurred", {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  }

  // Flush events (call before app closes)
  async flush() {
    if (!this.mixpanel || !this.trackingAllowed) return;
    await this.mixpanel.flush();
  }

  // Reset (for logout)
  reset() {
    if (!this.mixpanel || !this.trackingAllowed) return;
    this.mixpanel.reset();
  }

  // Check if tracking is allowed
  isTrackingAllowed(): boolean {
    return this.trackingAllowed;
  }
}

// Export singleton instance
export const Analytics = new AnalyticsService();
