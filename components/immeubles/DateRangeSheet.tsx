import { Icon } from "@/components/ui";
import { colors, fontWeight } from "@/constants/theme";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const pad = (n: number) => n.toString().padStart(2, "0");
const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getTime() === b.getTime();
const formatShort = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}`;

type DateRangeSheetProps = {
  open: boolean;
  onClose: () => void;
  initialFrom: Date | null;
  initialTo: Date | null;
  onApply: (from: Date | null, to: Date | null) => void;
};

/**
 * Sélecteur de PLAGE de dates (Du → Au) au design de l'app (calendrier mensuel
 * maison, comme le CalendarSheet des RDV) — remplace le picker natif. Autorise
 * les dates passées (filtre sur une date de création). Le premier tap fixe le
 * début, le second la fin ; un tap ultérieur repart d'un nouveau début.
 */
export function DateRangeSheet({
  open,
  onClose,
  initialFrom,
  initialTo,
  onApply,
}: DateRangeSheetProps) {
  const [from, setFrom] = useState<Date | null>(
    initialFrom ? startOfDay(initialFrom) : null,
  );
  const [to, setTo] = useState<Date | null>(
    initialTo ? startOfDay(initialTo) : null,
  );
  const [viewDate, setViewDate] = useState<Date>(
    () => initialFrom ?? initialTo ?? new Date(),
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const firstDayIdx = (first.getDay() + 6) % 7; // lundi en tête
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayIdx; i += 1) cells.push(null);
    for (let d = 1; d <= lastDate; d += 1) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const pickDay = (day: Date) => {
    const d = startOfDay(day);
    if (!from || (from && to)) {
      setFrom(d);
      setTo(null);
    } else if (d.getTime() >= from.getTime()) {
      setTo(d);
    } else {
      setFrom(d);
    }
  };

  const summary = from
    ? to
      ? `Du ${formatShort(from)} au ${formatShort(to)}`
      : `Depuis le ${formatShort(from)}`
    : "Sélectionne une plage";

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation?.()} style={styles.sheet}>
          <Text style={styles.summary}>{summary}</Text>

          <View style={styles.header}>
            <Pressable
              onPress={() => setViewDate(new Date(year, month - 1, 1))}
              style={styles.nav}
              hitSlop={10}
            >
              <Icon name="chevron-left" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>
              {MONTH_LABELS[month]} {year}
            </Text>
            <Pressable
              onPress={() => setViewDate(new Date(year, month + 1, 1))}
              style={styles.nav}
              hitSlop={10}
            >
              <Icon name="chevron-right" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEK_LABELS.map((d, i) => (
              <Text key={i} style={styles.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map((day, idx) => {
              if (!day) return <View key={idx} style={styles.cell} />;
              const isFrom = sameDay(day, from);
              const isTo = sameDay(day, to);
              const inRange =
                !!from &&
                !!to &&
                day.getTime() > from.getTime() &&
                day.getTime() < to.getTime();
              const isEndpoint = isFrom || isTo;
              return (
                <Pressable
                  key={idx}
                  onPress={() => pickDay(day)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.day,
                      inRange && styles.dayInRange,
                      isEndpoint && styles.dayEndpoint,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        (isEndpoint || inRange) && styles.dayTextActive,
                        isEndpoint && styles.dayTextEndpoint,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.clearBtn}
              onPress={() => {
                setFrom(null);
                setTo(null);
              }}
            >
              <Text style={styles.clearText}>Effacer</Text>
            </Pressable>
            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                onApply(from, to);
                onClose();
              }}
            >
              <Text style={styles.applyText}>Appliquer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  summary: {
    fontSize: 15,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nav: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  weekHeader: { flexDirection: "row" },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 0.6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayInRange: { backgroundColor: colors.primarySoft },
  dayEndpoint: { backgroundColor: colors.primary },
  dayText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  dayTextActive: { color: colors.primary },
  dayTextEndpoint: { color: colors.textOnPrimary },
  actions: { flexDirection: "row", gap: 10 },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  applyText: { fontSize: 14, fontWeight: "800", color: colors.textOnPrimary },
});
