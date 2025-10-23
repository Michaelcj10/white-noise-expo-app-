import * as InAppPurchases from "expo-in-app-purchases";
import * as SecureStore from "expo-secure-store";

const PRODUCT_ID = "pro_unlock";
const ENTITLEMENT_KEY = "entitlement_pro";

export async function initIAP(onEntitlement?: (owned: boolean) => void) {
  await InAppPurchases.connectAsync();

  // Try restore on startup (good UX, no backend needed)
  const owned = await restore();
  onEntitlement?.(owned);

  // Listen for purchase updates
  InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      results?.forEach(async (purchase) => {
        if (!purchase.acknowledged) {
          try {
            // Finish the transaction
            await InAppPurchases.finishTransactionAsync(purchase, true);
            
            // Check if this is our product
            if (purchase.productId === PRODUCT_ID) {
              await SecureStore.setItemAsync(ENTITLEMENT_KEY, "true");
              onEntitlement?.(true);
            }
          } catch (e) {
            console.warn("finishTransaction error", e);
          }
        }
      });
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      console.log("User canceled the purchase");
    } else if (errorCode) {
      console.warn("Purchase error:", errorCode);
    }
  });
}

export async function endIAP() {
  await InAppPurchases.disconnectAsync();
}

export async function loadProduct(): Promise<InAppPurchases.IAPItemDetails | null> {
  const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);
  
  if (responseCode === InAppPurchases.IAPResponseCode.OK) {
    return results?.[0] ?? null;
  }
  
  return null;
}

export async function buy() {
  await InAppPurchases.purchaseItemAsync(PRODUCT_ID);
}

export async function restore(): Promise<boolean> {
  const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
  
  if (responseCode === InAppPurchases.IAPResponseCode.OK) {
    const owned = results?.some((p) => p.productId === PRODUCT_ID) ?? false;
    await SecureStore.setItemAsync(ENTITLEMENT_KEY, owned ? "true" : "false");
    return owned;
  }
  
  await SecureStore.setItemAsync(ENTITLEMENT_KEY, "false");
  return false;
}

export async function isPro(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(ENTITLEMENT_KEY);
  return v === "true";
}
