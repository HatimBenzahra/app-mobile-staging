import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ConfirmActionOverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  icon?: keyof typeof Feather.glyphMap;
  highlight?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionOverlay({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  icon,
  highlight,
  onConfirm,
  onClose,
}: ConfirmActionOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(32)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isDanger = tone === "danger";
  const heroIcon = icon ?? (isDanger ? "trash-2" : "check-circle");
  const accentColor = isDanger ? "#DC2626" : "#16A34A";
  const accentSoft = isDanger ? "#FEE2E2" : "#DCFCE7";
  const accentRing = isDanger ? "#FCA5A5" : "#86EFAC";

  useEffect(() => {
    if (!open) return;
    opacity.setValue(0);
    translateY.setValue(32);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, scale, translateY]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { paddingBottom: insets.bottom + 18 }]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={[
            isTablet ? styles.sheetTabletWrap : styles.sheetWrap,
          ]}
        >
          <Animated.View
            style={[
              styles.sheet,
              isTablet && styles.sheetTablet,
              {
                opacity,
                transform: [{ translateY }, { scale }],
              },
            ]}
          >
            <View style={styles.handle} />

            <View
              style={[
                styles.heroOuter,
                { backgroundColor: accentSoft },
              ]}
            >
              <View
                style={[styles.heroRing, { borderColor: accentRing }]}
              />
              <View
                style={[
                  styles.heroInner,
                  { borderColor: accentRing },
                ]}
              >
                <Feather name={heroIcon} size={26} color={accentColor} />
              </View>
            </View>

            <Text style={[styles.title, isTablet && styles.titleTablet]}>
              {title}
            </Text>

            {highlight ? (
              <View
                style={[
                  styles.highlightChip,
                  { backgroundColor: accentSoft },
                ]}
              >
                <Text
                  style={[styles.highlightText, { color: accentColor }]}
                  numberOfLines={1}
                >
                  {highlight}
                </Text>
              </View>
            ) : null}

            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.ghostButton,
                  pressed && styles.ghostButtonPressed,
                ]}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={styles.ghostText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: accentColor },
                  pressed && styles.primaryButtonPressed,
                ]}
                onPress={onConfirm}
                accessibilityRole="button"
              >
                <Feather
                  name={isDanger ? "trash-2" : "check"}
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  sheetWrap: {
    width: "100%",
  },
  sheetTabletWrap: {
    alignSelf: "center",
    width: 560,
    marginBottom: 28,
  },
  sheet: {
    width: "100%",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  sheetTablet: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
    borderRadius: 32,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginBottom: 2,
  },
  heroOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  heroRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    opacity: 0.4,
  },
  heroInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  titleTablet: {
    fontSize: 21,
    lineHeight: 28,
  },
  highlightChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: "100%",
  },
  highlightText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
    maxWidth: 420,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#F1F5F9",
    marginTop: 4,
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  ghostButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ghostButtonPressed: {
    backgroundColor: "#F8FAFC",
  },
  ghostText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.1,
  },
  primaryButton: {
    flex: 1.2,
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});
