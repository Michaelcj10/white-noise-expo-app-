// your analytics config
import Constants from "expo-constants";

export const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || "";
