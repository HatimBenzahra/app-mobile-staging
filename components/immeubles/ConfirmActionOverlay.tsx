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
import { Chip, IconBadge } from "@/components/ui";
import { colors } from "@/constants/theme";

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
  const accentColor = isDanger ? colors.danger : colors.success;

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

            <IconBadge
              tone={isDanger ? "danger" : "success"}
              size="lg"
              icon={heroIcon}
            />

            <Text style={[styles.title, isTablet && styles.titleTablet]}>
              {title}
            </Text>

            {highlight ? (
              <Chip
                tone={isDanger ? "danger" : "success"}
                label={highlight}
              />
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
                  color={colors.textOnPrimary}
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
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 14,
    shadowColor: colors.text,
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
    backgroundColor: colors.border,
    marginBottom: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  titleTablet: {
    fontSize: 21,
    lineHeight: 28,
  },
  description: {
    fontSize: 13.5,
    color: colors.textStrong,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
    maxWidth: 420,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.surfaceMuted,
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
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  ghostButtonPressed: {
    backgroundColor: colors.background,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textStrong,
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
    shadowColor: colors.text,
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
    color: colors.textOnPrimary,
    letterSpacing: 0.1,
  },
});
