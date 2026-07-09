import { Icon } from "@/components/ui";
import { colors, fontWeight } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

type MyZoneChipProps = {
  insets: EdgeInsets;
  zoneName: string;
  onPress: () => void;
};

/**
 * Pastille flottante « Ma zone : {nom} » sous le ModeSwitch. Rappelle en
 * permanence la zone en cours (accent rouge, cohérent avec son contour) et
 * sert de raccourci pour recentrer dessus.
 */
export function MyZoneChip({ insets, zoneName, onPress }: MyZoneChipProps) {
  // Sous le ModeSwitch (haut) : top(10) + hauteur du switch (~50) + marge.
  const top = insets.top + 10 + 50 + 8;

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        style={styles.chip}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Recentrer sur ma zone : ${zoneName}`}
      >
        <Icon name="vector-polygon" size={14} color={colors.textOnPrimary} />
        <Text style={styles.text} numberOfLines={1}>
          Ma zone : {zoneName}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "80%",
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.danger,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    flexShrink: 1,
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: fontWeight.extrabold,
  },
});
