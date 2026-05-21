import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Chip, PressableCard } from "@/components/ui";
import { colors } from "@/constants/theme";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type { Porte } from "@/types/api";

type PortePickerOverlayProps = {
  open: boolean;
  portes: Porte[];
  title?: string;
  hint?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSelect: (porte: Porte) => void;
};

function groupByEtage(portes: Porte[]): Array<{ etage: number; portes: Porte[] }> {
  const map = new Map<number, Porte[]>();
  for (const porte of portes) {
    const list = map.get(porte.etage);
    if (list) list.push(porte);
    else map.set(porte.etage, [porte]);
  }
  return Array.from(map.entries())
    .map(([etage, items]) => ({
      etage,
      portes: items.sort((a, b) =>
        String(a.numero).localeCompare(String(b.numero), "fr", {
          numeric: true,
        }),
      ),
    }))
    .sort((a, b) => b.etage - a.etage);
}

export default function PortePickerOverlay({
  open,
  portes,
  title = "Choisis la porte à supprimer",
  hint = "Une fois supprimée, son audio et son historique seront définitivement perdus.",
  confirmLabel = "Supprimer cette porte",
  onClose,
  onSelect,
}: PortePickerOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 700;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const sections = useMemo(() => groupByEtage(portes), [portes]);
  const selected = useMemo(
    () => portes.find((p) => p.id === selectedId) ?? null,
    [portes, selectedId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    opacity.setValue(0);
    translateY.setValue(36);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, translateY]);

  const maxSheetHeight = Math.min(height * 0.82, isTablet ? 760 : 720);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { paddingBottom: insets.bottom + 12 }]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={isTablet ? styles.sheetTabletWrap : styles.sheetWrap}
        >
          <Animated.View
            style={[
              styles.sheet,
              isTablet && styles.sheetTablet,
              { maxHeight: maxSheetHeight, opacity, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.hint}>{hint}</Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={10}
                accessibilityLabel="Fermer"
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isTablet && styles.scrollContentTablet,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {sections.length === 0 ? (
                <Card variant="filled" padding="md" style={styles.emptyCardContainer}>
                  <Feather name="inbox" size={20} color={colors.textSubtle} />
                  <Text style={styles.emptyText}>Aucune porte à supprimer</Text>
                </Card>
              ) : (
                sections.map((section) => (
                  <View key={section.etage} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Chip tone="primary" label={String(section.etage)} />
                      <Text style={styles.sectionTitle}>
                        Étage {section.etage}
                      </Text>
                      <Text style={styles.sectionCount}>
                        {section.portes.length}{" "}
                        {section.portes.length > 1 ? "portes" : "porte"}
                      </Text>
                    </View>

                    <View style={[styles.grid, isTablet && styles.gridTablet]}>
                      {section.portes.map((porte) => {
                        const isSelected = porte.id === selectedId;
                        const key = getDisplayStatusKey(porte);
                        const status = key
                          ? (STATUS_DISPLAY[key] ?? DEFAULT_STATUS_OPTION)
                          : DEFAULT_STATUS_OPTION;

                        return (
                          <PressableCard
                            key={porte.id}
                            variant="outlined"
                            padding="none"
                            onPress={() =>
                              setSelectedId((prev) =>
                                prev === porte.id ? null : porte.id,
                              )
                            }
                            style={[
                              styles.tile,
                              isTablet && styles.tileTablet,
                              isSelected && styles.tileSelected,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Porte ${porte.numero}`}
                          >
                            <View style={styles.tileTop}>
                              <Text
                                style={[
                                  styles.tileNumber,
                                  isSelected && styles.tileNumberSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {porte.numero}
                              </Text>
                              {isSelected ? (
                                <View style={styles.tileCheck}>
                                  <Feather
                                    name="trash-2"
                                    size={12}
                                    color={colors.textOnPrimary}
                                  />
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.tileStatusDot,
                                    { backgroundColor: status.accent },
                                  ]}
                                />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.tileStatusLabel,
                                isSelected && styles.tileStatusLabelSelected,
                                !isSelected && { color: status.accent },
                              ]}
                              numberOfLines={1}
                            >
                              {status.label}
                            </Text>
                          </PressableCard>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  !selected && styles.confirmBtnDisabled,
                  pressed && selected && styles.confirmBtnPressed,
                ]}
                disabled={!selected}
                onPress={() => {
                  if (selected) onSelect(selected);
                }}
              >
                <Feather name="trash-2" size={15} color={colors.textOnPrimary} />
                <Text style={styles.confirmBtnText}>
                  {selected
                    ? `${confirmLabel} ${selected.numero}`
                    : "Choisis une porte"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
  sheetWrap: {
    width: "100%",
  },
  sheetTabletWrap: {
    alignSelf: "center",
    width: 620,
    marginBottom: 32,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingTop: 14,
    paddingBottom: 0,
    shadowColor: colors.text,
    shadowOpacity: 0.24,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    overflow: "hidden",
  },
  sheetTablet: {
    borderRadius: 32,
    paddingTop: 18,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  hint: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 18,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 20,
  },
  scrollContentTablet: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 24,
  },
  emptyCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: "600",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridTablet: {
    gap: 12,
  },
  tile: {
    flexBasis: "31.5%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    gap: 6,
    minHeight: 76,
  },
  tileTablet: {
    flexBasis: "23%",
    padding: 14,
  },
  tileSelected: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
    flex: 1,
  },
  tileNumberSelected: {
    color: colors.textOnPrimary,
  },
  tileStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  tileCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileStatusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  tileStatusLabelSelected: {
    color: "rgba(255,255,255,0.92)",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  cancelBtnPressed: {
    backgroundColor: colors.background,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textStrong,
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: "row",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnPressed: {
    opacity: 0.9,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textOnPrimary,
    letterSpacing: 0.1,
  },
});
