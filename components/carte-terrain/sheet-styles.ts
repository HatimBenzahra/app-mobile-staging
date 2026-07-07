import {
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
} from "@/constants/theme";
import { StyleSheet } from "react-native";

/**
 * Styles STRUCTURELS partagés par les cartes flottantes bas d'écran de la carte
 * terrain (`ZoneSheet`, `ZonesHistoryModal`, …) : même form-factor (Card
 * `position:absolute` ancrée en bas, header icône + titre + bouton fermer). Les
 * teintes sémantiques (accent de l'icône) restent posées par chaque consommateur
 * pour ne pas figer une couleur unique. Évite la duplication du châssis de sheet.
 */
export const sheetStyles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
});
