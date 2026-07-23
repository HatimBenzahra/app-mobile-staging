import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { ProgressBar, Icon } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { BadgeDefinitionType } from "@/types/graphql-schema";
import {
  categoryStyle,
  resolveBadgeCustomUrl,
  resolveBadgeIconKey,
} from "@/utils/business/badgeVisuals";
import { badgeIcon } from "@/utils/business/gameIcons";

type Props = {
  badge: Pick<BadgeDefinitionType, "code" | "nom" | "description" | "category" | "iconUrl">;
  current: number;
  threshold: number;
  percent: number;
};

/** Ligne "badge proche" : icône (Game Icons) + nom + barre de progression X/Y. */
export function NextBadgeRow({ badge, current, threshold, percent }: Props) {
  const style = categoryStyle(badge.category);
  const customUrl = resolveBadgeCustomUrl(badge);
  const IconSvg = badgeIcon(resolveBadgeIconKey(badge));
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: style.bg, borderColor: style.border }]}>
        {customUrl && !imgFailed ? (
          <Image
            source={{ uri: customUrl }}
            style={styles.iconImg}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
          />
        ) : IconSvg ? (
          <IconSvg width={24} height={24} color={style.text} />
        ) : (
          <Icon name={style.fallbackIcon} size={18} color={style.text} />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {badge.nom}
          </Text>
          <Text style={[styles.count, { color: style.text }]}>
            {current}/{threshold}
          </Text>
        </View>
        {badge.description ? (
          <Text style={styles.desc} numberOfLines={1}>
            {badge.description}
          </Text>
        ) : null}
        <ProgressBar value={percent} color={style.accent} height={6} style={styles.bar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: 24,
    height: 24,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  count: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  bar: {
    marginTop: 2,
  },
});

export default NextBadgeRow;
