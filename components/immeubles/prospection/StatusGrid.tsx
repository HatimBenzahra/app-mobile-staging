import { Feather } from "@expo/vector-icons";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type StatusKey =
  | "ABSENT"
  | "REFUS"
  | "ARGUMENTE"
  | "RENDEZ_VOUS_PRIS"
  | "CONTRAT_SIGNE";

type StatusDescriptor = {
  key: StatusKey;
  label: string;
  hint: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  accentSoft: string;
  accentInk: string;
};

const STATUSES: Record<Exclude<StatusKey, "ABSENT">, StatusDescriptor> = {
  REFUS: {
    key: "REFUS",
    label: "Refus",
    hint: "Pas intéressé",
    icon: "x-circle",
    accent: "#DC2626",
    accentSoft: "#FEE2E2",
    accentInk: "#7F1D1D",
  },
  ARGUMENTE: {
    key: "ARGUMENTE",
    label: "Argumenté",
    hint: "À recontacter",
    icon: "message-circle",
    accent: "#CA8A04",
    accentSoft: "#FEF3C7",
    accentInk: "#713F12",
  },
  RENDEZ_VOUS_PRIS: {
    key: "RENDEZ_VOUS_PRIS",
    label: "RDV pris",
    hint: "Date planifiée",
    icon: "calendar",
    accent: "#0284C7",
    accentSoft: "#E0F2FE",
    accentInk: "#0C4A6E",
  },
  CONTRAT_SIGNE: {
    key: "CONTRAT_SIGNE",
    label: "Contrat",
    hint: "Signé sur place",
    icon: "award",
    accent: "#059669",
    accentSoft: "#D1FAE5",
    accentInk: "#064E3B",
  },
};

type StatusGridProps = {
  selected: StatusKey | null;
  onSelect: (key: StatusKey) => void;
  onAbsentShortcut: () => void;
  isTablet?: boolean;
};

const StatusCard = memo(function StatusCard({
  desc,
  isSelected,
  isDimmed,
  onSelect,
}: {
  desc: StatusDescriptor;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (key: StatusKey) => void;
}) {
  const scale = useSharedValue(1);
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 80 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 140 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => onSelect(desc.key), [onSelect, desc.key]);

  return (
    <Animated.View style={[styles.cardWrap, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          isSelected && {
            borderColor: desc.accent,
            backgroundColor: desc.accentSoft,
          },
          isDimmed && styles.cardDimmed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Statut ${desc.label}`}
      >
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: isSelected ? desc.accent : desc.accentSoft },
          ]}
        >
          <Feather
            name={desc.icon}
            size={18}
            color={isSelected ? "#FFFFFF" : desc.accent}
          />
        </View>
        <View style={styles.cardText}>
          <Text
            style={[
              styles.cardLabel,
              isSelected && { color: desc.accentInk },
            ]}
          >
            {desc.label}
          </Text>
          <Text
            style={[
              styles.cardHint,
              isSelected && { color: desc.accentInk, opacity: 0.78 },
            ]}
          >
            {desc.hint}
          </Text>
        </View>
        {isSelected ? (
          <View style={[styles.cardCheck, { backgroundColor: desc.accent }]}>
            <Feather name="check" size={11} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

function StatusGridImpl({
  selected,
  onSelect,
  onAbsentShortcut,
  isTablet = false,
}: StatusGridProps) {
  const absentSelected = selected === "ABSENT";

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onAbsentShortcut}
        style={[
          styles.absent,
          absentSelected && styles.absentSelected,
          isTablet && styles.absentTablet,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Marquer absent et clôturer la porte"
      >
        <View style={styles.absentLeft}>
          <View
            style={[
              styles.absentIcon,
              absentSelected && { backgroundColor: "#FFFFFF" },
            ]}
          >
            <Feather
              name="home"
              size={20}
              color={absentSelected ? "#92400E" : "#92400E"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.absentLabel}>Absent</Text>
            <Text style={styles.absentHint}>
              Aucune réponse — clôture la porte en un tap
            </Text>
          </View>
        </View>
        <View style={styles.absentChevron}>
          <Feather name="arrow-right" size={18} color="#92400E" />
        </View>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OU choisis un statut</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={[styles.grid, isTablet && styles.gridTablet]}>
        {(Object.keys(STATUSES) as Array<keyof typeof STATUSES>).map((key) => {
          const desc = STATUSES[key];
          const isSelected = selected === desc.key;
          const isDimmed = selected !== null && !isSelected && selected !== "ABSENT";
          return (
            <StatusCard
              key={desc.key}
              desc={desc}
              isSelected={isSelected}
              isDimmed={isDimmed}
              onSelect={onSelect}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  absent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    gap: 12,
  },
  absentSelected: {
    backgroundColor: "#FCD34D",
    borderColor: "#D97706",
  },
  absentTablet: {
    padding: 18,
  },
  absentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  absentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  absentLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#78350F",
    letterSpacing: -0.2,
  },
  absentHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#92400E",
    opacity: 0.85,
  },
  absentChevron: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridTablet: {
    gap: 14,
  },
  cardWrap: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 10,
    minHeight: 64,
  },
  cardDimmed: {
    opacity: 0.55,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  cardHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },
  cardCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(StatusGridImpl);

export { STATUSES };
export type { StatusDescriptor };
