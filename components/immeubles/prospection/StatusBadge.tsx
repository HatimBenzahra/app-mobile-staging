import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
} from "@/components/immeubles/prospection/status-display";

type StatusBadgeProps = {
  statusKey: string | null;
  size?: "sm" | "md";
};

function StatusBadgeImpl({ statusKey, size = "sm" }: StatusBadgeProps) {
  const status = statusKey
    ? (STATUS_DISPLAY[statusKey] ?? DEFAULT_STATUS_OPTION)
    : DEFAULT_STATUS_OPTION;

  const isMd = size === "md";

  return (
    <View
      style={[
        styles.pill,
        isMd && styles.pillMd,
        { backgroundColor: `${status.accent}1A`, borderColor: `${status.accent}33` },
      ]}
    >
      <Feather
        name={status.icon}
        size={isMd ? 12 : 10}
        color={status.accent}
      />
      <Text
        style={[
          styles.label,
          isMd && styles.labelMd,
          { color: status.accent },
        ]}
        numberOfLines={1}
      >
        {status.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  labelMd: {
    fontSize: 11.5,
  },
});

export default memo(StatusBadgeImpl);
