// Web mock for expo-tracking-transparency (iOS-only module)
export const PermissionStatus = {
  GRANTED: "granted",
  DENIED: "denied",
  UNDETERMINED: "undetermined",
};

export async function requestTrackingPermissionsAsync() {
  // On web, we don't need iOS ATT, so we default to granted
  return {
    status: PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: false,
    expires: "never",
  };
}

export async function getTrackingPermissionsAsync() {
  return {
    status: PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: false,
    expires: "never",
  };
}
