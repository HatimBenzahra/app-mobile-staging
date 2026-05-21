import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ReactElement, RefObject } from "react";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

type StatusOption = {
  value: string;
  label: string;
  description: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

type StatusFilterSheetProps = {
  filterSheetRef: RefObject<BottomSheetModal | null>;
  filterSnapPoints: string[];
  renderSheetBackdrop: (props: any, opacity: number) => ReactElement;
  statusCounts: Record<string, number>;
  pendingStatusFilter: string | null;
  statusOptions: StatusOption[];
  totalCount: number;
  isTablet: boolean;
  onSheetClose: () => void;
  togglePendingFilter: (value: string | null) => void;
  clearStatusFilters: () => void;
  applyStatusFilters: () => void;
  selectStatusFilter: (value: string | null) => void;
  activeStatusFilter: string | null;
  styles: Record<string, any>;
};

function StatusFilterSheet({
  filterSheetRef,
  filterSnapPoints,
  renderSheetBackdrop,
  statusCounts,
  statusOptions,
  totalCount,
  isTablet,
  onSheetClose,
  selectStatusFilter,
  activeStatusFilter,
  styles,
}: StatusFilterSheetProps) {
  const visibleOptions = statusOptions.filter(
    (opt) => (statusCounts[opt.value] ?? 0) > 0,
  );

  return (
    <BottomSheetModal
      ref={filterSheetRef}
      snapPoints={filterSnapPoints}
      enablePanDownToClose
      backdropComponent={(props) => renderSheetBackdrop(props, 0.5)}
      onChange={(index) => {
        if (index === -1) onSheetClose();
      }}
      backgroundStyle={styles.filterSheetBackground}
      handleIndicatorStyle={styles.filterHandleIndicator}
      animateOnMount
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.sheetContent,
          isTablet && styles.sheetContentTablet,
          s.contentContainer,
        ]}
      >
        <View style={s.header}>
          <View>
            <Text style={s.title}>Filtrer par statut</Text>
            <Text style={s.subtitle}>
              {activeStatusFilter
                ? "Tape un autre statut ou « Toutes les portes »"
                : "Tape un statut pour filtrer la liste"}
            </Text>
          </View>
          <Pressable
            style={s.closeBtn}
            onPress={() => filterSheetRef.current?.dismiss()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Feather name="x" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={s.list}>
          <Pressable
            onPress={() => selectStatusFilter(null)}
            style={[
              s.row,
              activeStatusFilter === null && s.rowActiveNeutral,
            ]}
            accessibilityRole="button"
          >
            <View style={s.rowLeft}>
              <View style={s.rowIconNeutral}>
                <Feather name="layers" size={15} color={colors.text} />
              </View>
              <Text
                style={[
                  s.rowLabel,
                  activeStatusFilter === null && s.rowLabelActive,
                ]}
              >
                Toutes les portes
              </Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.countText}>{totalCount}</Text>
              {activeStatusFilter === null ? (
                <Feather name="check" size={16} color={colors.text} />
              ) : null}
            </View>
          </Pressable>

          {visibleOptions.map((option) => {
            const isSelected = activeStatusFilter === option.value;
            const count = statusCounts[option.value] ?? 0;
            return (
              <Pressable
                key={option.value}
                onPress={() => selectStatusFilter(option.value)}
                style={[
                  s.row,
                  isSelected && {
                    backgroundColor: `${option.accent}0F`,
                    borderColor: `${option.accent}55`,
                  },
                ]}
                accessibilityRole="button"
              >
                <View style={s.rowLeft}>
                  <View
                    style={[
                      s.rowIcon,
                      { backgroundColor: `${option.accent}1A` },
                    ]}
                  >
                    <Feather
                      name={option.icon}
                      size={14}
                      color={option.accent}
                    />
                  </View>
                  <Text
                    style={[
                      s.rowLabel,
                      isSelected && { color: option.accent },
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                </View>
                <View style={s.rowRight}>
                  <Text
                    style={[
                      s.countText,
                      isSelected && { color: option.accent },
                    ]}
                  >
                    {count}
                  </Text>
                  {isSelected ? (
                    <Feather name="check" size={16} color={option.accent} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
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
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  rowActiveNeutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconNeutral: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  rowLabelActive: {
    color: colors.text,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textStrong,
    fontVariant: ["tabular-nums"],
    minWidth: 18,
    textAlign: "right",
  },
});

export default memo(StatusFilterSheet);
