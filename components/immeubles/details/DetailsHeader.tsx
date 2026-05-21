import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type DetailsHeaderProps = {
  topInset: number;
  adresse: string;
  nbEtages: number;
  nbPortesParEtage: number;
  onBack: () => void;
};

function DetailsHeader({
  topInset,
  adresse,
  nbEtages,
  nbPortesParEtage,
  onBack,
}: DetailsHeaderProps) {
  const portesText =
    nbPortesParEtage > 0
      ? `${nbEtages} étage${nbEtages > 1 ? "s" : ""} · ${nbPortesParEtage} portes/étage`
      : `${nbEtages} étage${nbEtages > 1 ? "s" : ""}`;

  return (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Feather name="chevron-left" size={20} color={colors.textOnPrimary} />
      </Pressable>

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {adresse}
        </Text>
        <View style={styles.subtitleRow}>
          <View style={styles.subtitleDot} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {portesText}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  backButtonPressed: {
    backgroundColor: "#1E293B",
    transform: [{ scale: 0.95 }],
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  subtitleDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.textSubtle,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

export default memo(DetailsHeader);
