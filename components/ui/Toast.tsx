import { Feather } from "@expo/vector-icons";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
} from "@/constants/theme";

export type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  show: (input: ToastInput) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 3200;

const variantStyle: Record<
  ToastVariant,
  { bg: string; iconBg: string; icon: keyof typeof Feather.glyphMap; iconColor: string }
> = {
  success: {
    bg: colors.text,
    iconBg: colors.successSoft,
    icon: "check",
    iconColor: colors.success,
  },
  error: {
    bg: colors.text,
    iconBg: colors.dangerSoft,
    icon: "alert-triangle",
    iconColor: colors.danger,
  },
  info: {
    bg: colors.text,
    iconBg: colors.primarySoft,
    icon: "info",
    iconColor: colors.primary,
  },
};

type InternalToast = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<InternalToast | null>(null);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (input: ToastInput) => {
      idCounter.current += 1;
      const id = idCounter.current;
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      setToast({ ...input, id });
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      const duration = input.durationMs ?? DEFAULT_DURATION_MS;
      hideTimer.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const ctx = useMemo<ToastContextValue>(() => ({ show, hide }), [show, hide]);

  const styling = toast ? variantStyle[toast.variant ?? "info"] : null;

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toast && styling ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              bottom: insets.bottom + spacing.lg,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: styling.bg }]}>
            <View
              style={[styles.iconWrap, { backgroundColor: styling.iconBg }]}
            >
              <Feather
                name={styling.icon}
                size={16}
                color={styling.iconColor}
              />
            </View>
            <Text style={styles.message} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                ]}
              >
                <Text style={styles.actionLabel}>{toast.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.lg,
    ...shadows.lg,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  action: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.whiteAlpha20,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

export default ToastProvider;
