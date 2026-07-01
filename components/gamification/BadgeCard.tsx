import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { BadgeDefinitionType } from "@/types/graphql-schema";
import { categoryStyle, resolveBadgeIconUrl } from "@/utils/business/badgeVisuals";

type Props = {
  badge: Pick<BadgeDefinitionType, "code" | "nom" | "description" | "category" | "iconUrl" | "tier">;
  /** Badge obtenu par l'utilisateur (sinon affiché verrouillé/atténué). */
  earned?: boolean;
};

export function BadgeCard({ badge, earned = false }: Props) {
  const style = categoryStyle(badge.category);
  const iconUrl = resolveBadgeIconUrl(badge);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Card
      variant="outlined"
      padding="sm"
      style={[styles.card, !earned && styles.cardLocked]}
    >
      <View style={styles.iconWrap}>
        {iconUrl && !imgFailed ? (
          <Image
            source={{ uri: iconUrl }}
            style={styles.iconImg}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Feather name={style.fallbackIcon} size={20} color={colors.textMuted} />
        )}
        {!earned ? (
          <View style={styles.lockPill}>
            <Feather name="lock" size={9} color={colors.textInverse} />
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {badge.nom}
      </Text>
      {badge.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {badge.description}
        </Text>
      ) : null}
      {badge.tier ? (
        <View style={styles.tierTag}>
          <Text style={styles.tierText}>Niveau {badge.tier}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "31%",
    minWidth: 100,
    alignItems: "center",
    gap: spacing.xs,
  },
  cardLocked: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: 28,
    height: 28,
  },
  lockPill: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
  tierTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textStrong,
  },
});

export default BadgeCard;
