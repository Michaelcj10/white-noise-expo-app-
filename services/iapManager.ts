import * as SecureStore from "expo-secure-store";
import {
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  getProducts,
  initConnection,
  Product,
  ProductPurchase,
  PurchaseError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from "react-native-iap";

const PRODUCT_ID = "pro_unlock";
const ENTITLEMENT_KEY = "entitlement_pro";

let purchaseUpdateSub: any;
let purchaseErrorSub: any;

export async function initIAP(onEntitlement?: (owned: boolean) => void) {
  await initConnection();

  // Try restore on startup (good UX, no backend needed)
  const owned = await restore();
  onEntitlement?.(owned);

  // Listen for updates
  purchaseUpdateSub = purchaseUpdatedListener(
    async (purchase: ProductPurchase) => {
      try {
        if (purchase.productId === PRODUCT_ID) {
          // Acknowledge/consume as needed (finishTransaction handles ack for INAPP)
          await finishTransaction({ purchase, isConsumable: false });
          await SecureStore.setItemAsync(ENTITLEMENT_KEY, "true");
          onEntitlement?.(true);
        }
      } catch (e) {
        console.warn("finishTransaction error", e);
      }
    }
  );

  purchaseErrorSub = purchaseErrorListener((err: PurchaseError) => {
    console.warn("purchaseErrorListener", err);
  });
}

export async function endIAP() {
  purchaseUpdateSub?.remove?.();
  purchaseErrorSub?.remove?.();
  await endConnection();
}

export async function loadProduct(): Promise<Product | null> {
  const prods = await getProducts({ skus: [PRODUCT_ID] });
  return prods?.[0] ?? null;
}

export async function buy() {
  await requestPurchase({ skus: [PRODUCT_ID] });
}

export async function restore(): Promise<boolean> {
  const purchases = await getAvailablePurchases();
  const owned = purchases.some((p) => p.productId === PRODUCT_ID);
  await SecureStore.setItemAsync(ENTITLEMENT_KEY, owned ? "true" : "false");
  return owned;
}

export async function isPro(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(ENTITLEMENT_KEY);
  return v === "true";
}
