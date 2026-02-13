// app.config.js
import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    scheme: "drowse",
    extra: {
      ...(config?.extra || {}),
      mixpanelToken: process.env.EXPO_MIXPANEL_TOKEN,
      revenueCatGoogleApiKey: process.env.REVENUECAT_GOOGLE_API_KEY,
      revenueCatIosApiKey: process.env.REVENUECAT_GOOGLE_API_KEY || "",
    },
  };
};
