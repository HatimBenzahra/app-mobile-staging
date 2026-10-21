import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import type { ImmeubleMembre } from "@/types/api";

type MembreAvatarProps = {
  membre: Pick<ImmeubleMembre, "prenom" | "nom">;
  size?: number;
};

const initialesOf = ({ prenom, nom }: Pick<ImmeubleMembre, "prenom" | "nom">) =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

/** Pastille d'initiales d'un membre (même rendu que les avatars de l'équipe). */
function MembreAvatarImpl({ membre, size = 32 }: MembreAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initiales, { fontSize: Math.round(size * 0.36) }]}>
        {initialesOf(membre)}
      </Text>
    </View>
  );
}

export const MembreAvatar = memo(MembreAvatarImpl);

type MembresAvatarsProps = {
  membres: ImmeubleMembre[];
  max?: number;
  size?: number;
};

/** Pile d'avatars des membres d'un immeuble partagé, « +N » au-delà de `max`. */
function MembresAvatarsImpl({ membres, max = 3, size = 28 }: MembresAvatarsProps) {
  const visibles = membres.slice(0, max);
  const reste = membres.length - visibles.length;
  const overlap = -Math.round(size * 0.3);

  return (
    <View style={styles.stack}>
      {visibles.map((membre, index) => (
        <View
          key={`${membre.type}-${membre.id}`}
          style={[styles.ring, index > 0 && { marginLeft: overlap }]}
        >
          <MembreAvatar membre={membre} size={size} />
        </View>
      ))}
      {reste > 0 ? (
        <View style={[styles.ring, { marginLeft: overlap }]}>
          <View
            style={[
              styles.avatar,
              styles.more,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Text style={[styles.moreText, { fontSize: Math.round(size * 0.36) }]}>
              +{reste}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const MembresAvatars = memo(MembresAvatarsImpl);

const styles = StyleSheet.create({
  stack: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Liseré de la couleur du fond : sépare les pastilles qui se chevauchent.
  ring: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  initiales: {
    fontWeight: "700",
    color: colors.primary,
  },
  more: {
    backgroundColor: colors.surfaceMuted,
  },
  moreText: {
    fontWeight: "700",
    color: colors.textMuted,
  },
});
