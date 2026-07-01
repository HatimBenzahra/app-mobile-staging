import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { ContratValideType } from "@/types/graphql-schema";

type Props = {
  contrat: Pick<
    ContratValideType,
    | "offreNom"
    | "offreCategorie"
    | "offreFournisseur"
    | "offreLogoUrl"
    | "offrePoints"
    | "dateValidation"
  >;
};

/** Logo d'offre WinLead+ (préfixe le domaine si chemin relatif) — comme le web. */
function resolveOffreLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http")) return logoUrl;
  return `https://www.winleadplus.com${logoUrl}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Ligne d'un contrat signé : logo offre + nom/catégorie/fournisseur/date, points à droite. */
export function ContractRow({ contrat }: Props) {
  const logoUrl = resolveOffreLogoUrl(contrat.offreLogoUrl);
  const [imgFailed, setImgFailed] = useState(false);

  const sub = [contrat.offreCategorie, contrat.offreFournisseur, formatDate(contrat.dateValidation)]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        {logoUrl && !imgFailed ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Feather name="package" size={16} color={colors.textMuted} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {contrat.offreNom ?? "Offre inconnue"}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text style={styles.points}>+{contrat.offrePoints ?? 0} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 3,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  points: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

export default ContractRow;
