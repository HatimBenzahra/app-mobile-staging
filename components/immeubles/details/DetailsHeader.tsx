import { memo } from "react";
import { Icon } from "@/components/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { getLieuTerms } from "@/components/immeubles/lieu-terms";
import { MembresAvatars } from "@/components/immeubles/details/MembreAvatar";
import type { ImmeubleMembre, TypeHabitat } from "@/types/api";

type DetailsHeaderProps = {
  topInset: number;
  adresse: string;
  nbEtages: number;
  nbPortesParEtage: number;
  onBack: () => void;
  typeHabitat?: TypeHabitat;
  nbMaisonsPrevu?: number | null;
  /** Membres de l'immeuble : avatars affichés dès qu'il est partagé. */
  membres?: ImmeubleMembre[];
  /** Ouvre la feuille de partage ; sans callback, pas de bouton. */
  onShare?: () => void;
};

function DetailsHeader({
  topInset,
  adresse,
  nbEtages,
  nbPortesParEtage,
  onBack,
  typeHabitat,
  nbMaisonsPrevu,
  membres,
  onShare,
}: DetailsHeaderProps) {
  const terms = getLieuTerms(typeHabitat);
  const portesText = terms.headerSubtitle(
    nbEtages,
    nbPortesParEtage,
    nbMaisonsPrevu,
  );
  const nbAutres = Math.max(0, (membres?.length ?? 0) - 1);
  const isShared = nbAutres > 0;

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
        <Icon name="chevron-left" size={20} color={colors.textOnPrimary} />
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

      {onShare ? (
        <Pressable
          style={({ pressed }) => [
            styles.shareButton,
            pressed && styles.shareButtonPressed,
          ]}
          onPress={onShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            isShared
              ? `Partagé avec ${nbAutres} coéquipier${nbAutres > 1 ? "s" : ""}`
              : "Partager"
          }
        >
          {isShared && membres ? (
            <MembresAvatars membres={membres} size={26} />
          ) : null}
          <View style={styles.shareIcon}>
            <Icon name="user-plus" size={17} color={colors.text} />
          </View>
        </Pressable>
      ) : null}
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
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
  },
  shareButtonPressed: {
    opacity: 0.7,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

export default memo(DetailsHeader);
