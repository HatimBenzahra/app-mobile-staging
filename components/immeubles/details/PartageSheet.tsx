import {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Icon } from "@/components/ui";
import { MembreAvatar } from "@/components/immeubles/details/MembreAvatar";
import { colors } from "@/constants/theme";
import { useMesCoequipiers } from "@/hooks/api/use-mes-coequipiers";
import { usePartagerImmeuble } from "@/hooks/api/use-partager-immeuble";
import type { Coequipier, ImmeubleMembre } from "@/types/api";
import {
  isViewerMembre,
  type ImmeubleViewer,
} from "@/utils/business/immeuble-membres";
import type { ReactElement, RefObject } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type PartageSheetProps = {
  sheetRef: RefObject<BottomSheetModal | null>;
  snapPoints: string[];
  renderSheetBackdrop: (props: BottomSheetBackdropProps, opacity: number) => ReactElement;
  immeubleId: number;
  membres: ImmeubleMembre[];
  viewer: ImmeubleViewer | null;
  /** « l'immeuble », « la maison »… (cf. getLieuTerms). */
  lieuLabel: string;
  isTablet: boolean;
  onQuitter: () => void;
  onSheetClose: () => void;
};

const nomComplet = (personne: { prenom: string; nom: string }) =>
  `${personne.prenom} ${personne.nom}`.trim();

/**
 * Feuille « Partager » d'un immeuble : membres actuels, coéquipiers à qui le
 * partager (un tap, sans validation) et sortie de l'immeuble. Le partage est
 * reflété tout de suite dans la liste, avant même le rechargement de la fiche.
 */
function PartageSheet({
  sheetRef,
  snapPoints,
  renderSheetBackdrop,
  immeubleId,
  membres,
  viewer,
  lieuLabel,
  isTablet,
  onQuitter,
  onSheetClose,
}: PartageSheetProps) {
  const coequipiers = useMesCoequipiers();
  const { partager, error: partageError } = usePartagerImmeuble();
  const [pendingId, setPendingId] = useState<number | null>(null);
  // Membres renvoyés par la dernière mutation, en attendant que la fiche
  // recharge l'immeuble (data-sync) et repasse des membres à jour.
  const [membresPartages, setMembresPartages] = useState<ImmeubleMembre[] | null>(null);
  useEffect(() => {
    setMembresPartages(null);
  }, [membres]);
  const membresAffiches = membresPartages ?? membres;

  const membreCommercialIds = useMemo(
    () =>
      new Set(
        membresAffiches
          .filter((membre) => membre.type === "COMMERCIAL")
          .map((membre) => membre.id),
      ),
    [membresAffiches],
  );

  const handlePartager = async (coequipier: Coequipier) => {
    if (pendingId !== null) return;
    setPendingId(coequipier.id);
    const next = await partager(immeubleId, coequipier.id);
    setPendingId(null);
    if (next) setMembresPartages(next);
  };

  const coequipiersList = coequipiers.data ?? [];

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={(props) => renderSheetBackdrop(props, 0.5)}
      onChange={(index) => {
        if (index === -1) onSheetClose();
      }}
      backgroundStyle={s.background}
      handleIndicatorStyle={s.handleIndicator}
      animateOnMount
    >
      <BottomSheetScrollView
        contentContainerStyle={[s.content, isTablet && s.contentTablet]}
      >
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.title}>Partager {lieuLabel}</Text>
            <Text style={s.subtitle}>
              Ton coéquipier y a accès tout de suite, depuis ses Lieux et sa
              carte.
            </Text>
          </View>
          <Pressable
            style={s.closeBtn}
            onPress={() => sheetRef.current?.dismiss()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Icon name="x" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Membres · {membresAffiches.length}</Text>
          {membresAffiches.map((membre) => (
            <View key={`${membre.type}-${membre.id}`} style={s.row}>
              <View style={s.rowLeft}>
                <MembreAvatar membre={membre} />
                <Text style={s.rowLabel} numberOfLines={1}>
                  {nomComplet(membre)}
                </Text>
              </View>
              {viewer && isViewerMembre(membre, viewer) ? (
                <Text style={s.rowHint}>Toi</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Coéquipiers</Text>
          {coequipiers.loading && coequipiersList.length === 0 ? (
            <View style={s.stateBox}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : coequipiers.error && coequipiersList.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateText}>Impossible de charger tes coéquipiers.</Text>
              <Pressable
                style={s.retryButton}
                onPress={() => void coequipiers.refetch()}
                accessibilityRole="button"
              >
                <Icon name="refresh-cw" size={14} color={colors.primary} />
                <Text style={s.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : coequipiersList.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateText}>Aucun coéquipier dans ton équipe.</Text>
            </View>
          ) : (
            coequipiersList.map((coequipier) => {
              const dejaMembre = membreCommercialIds.has(coequipier.id);
              const isPending = pendingId === coequipier.id;
              return (
                <Pressable
                  key={coequipier.id}
                  style={({ pressed }) => [
                    s.row,
                    pressed && !dejaMembre && s.rowPressed,
                  ]}
                  onPress={() => void handlePartager(coequipier)}
                  disabled={dejaMembre || pendingId !== null}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: dejaMembre }}
                  accessibilityLabel={
                    dejaMembre
                      ? `${nomComplet(coequipier)}, déjà membre`
                      : `Partager avec ${nomComplet(coequipier)}`
                  }
                >
                  <View style={[s.rowLeft, dejaMembre && s.rowMuted]}>
                    <MembreAvatar membre={coequipier} />
                    <Text style={s.rowLabel} numberOfLines={1}>
                      {nomComplet(coequipier)}
                    </Text>
                  </View>
                  {dejaMembre ? (
                    <Text style={s.rowHint}>Déjà membre</Text>
                  ) : isPending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={s.sharePill}>
                      <Icon name="user-plus" size={13} color={colors.primary} />
                      <Text style={s.sharePillText}>Partager</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
          {partageError ? <Text style={s.errorText}>{partageError}</Text> : null}
        </View>

        {membresAffiches.length > 1 ? (
          <Pressable
            style={({ pressed }) => [s.quitButton, pressed && s.rowPressed]}
            onPress={onQuitter}
            accessibilityRole="button"
          >
            <Icon name="log-out" size={16} color={colors.dangerText} />
            <Text style={s.quitText}>Quitter {lieuLabel}</Text>
          </Pressable>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 32,
    gap: 20,
  },
  contentTablet: {
    paddingHorizontal: 16,
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  section: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowMuted: {
    opacity: 0.55,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.text,
  },
  rowHint: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.textSubtle,
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  sharePillText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },
  stateBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  stateText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  errorText: {
    paddingHorizontal: 4,
    fontSize: 12.5,
    color: colors.dangerText,
  },
  quitButton: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
  },
  quitText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.dangerText,
  },
});

export default memo(PartageSheet);
