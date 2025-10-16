import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { buy, endIAP, initIAP, loadProduct, restore } from "./iapManager";

export default function Paywall({
  visible,
  onClose,
  onUnlock,
}: {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    if (visible) {
      (async () => {
        await initIAP((owned: any) => {
          if (owned) {
            onUnlock();
            onClose();
          }
        });
        const p = await loadProduct();
        if (mounted) {
          setPrice(p?.localizedPrice ?? "");
          setLoading(false);
        }
      })();
    }
    return () => {
      mounted = false;
      endIAP();
    };
  }, [visible]);

  const onBuy = async () => {
    try {
      await buy();
    } catch (e) {
      /* show toast */
    }
  };

  const onRestore = async () => {
    setLoading(true);
    const ok = await restore();
    setLoading(false);
    if (ok) {
      onUnlock();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "#0006",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 6 }}>
            Go Pro
          </Text>
          <Text style={{ opacity: 0.7, marginBottom: 16 }}>
            Unlock all premium 60-minute sounds forever with a one-time
            purchase.
          </Text>

          {loading ? (
            <ActivityIndicator />
          ) : (
            <>
              <TouchableOpacity
                onPress={onBuy}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: "#6366f1",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Unlock • {price}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onRestore}
                style={{ padding: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Restore Purchases</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8, alignItems: "center", marginTop: 8 }}
          >
            <Text>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
