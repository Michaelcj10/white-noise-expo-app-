// app.config.js
import "dotenv/config";

export default ({ config }) => {
  return {
    ...config,
    scheme: "drowse",
    extra: {
      ...(config?.extra || {}),
      mixpanelToken: process.env.EXPO_MIXPANEL_TOKEN,
    },
  };
};
