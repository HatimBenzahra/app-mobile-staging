import { Feather } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type RdvQuickPickerProps = {
  rdvDate: string; // YYYY-MM-DD
  rdvTime: string; // HH:mm
  onChangeDate: (date: string) => void;
  onChangeTime: (time: string) => void;
};

type DayChip = {
  iso: string;
  label: string;
  sublabel: string;
  isToday: boolean;
  isTomorrow: boolean;
};

const WEEKDAY_LABELS = [
  "dim.",
  "lun.",
  "mar.",
  "mer.",
  "jeu.",
  "ven.",
  "sam.",
];

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildDayChips(days = 10): DayChip[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const chips: DayChip[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISODate(d);
    const isToday = i === 0;
    const isTomorrow = i === 1;
    const isDayAfter = i === 2;
    let label: string;
    if (isToday) label = "Aujourd'hui";
    else if (isTomorrow) label = "Demain";
    else if (isDayAfter) label = "Après-demain";
    else label = `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()}`;
    const sublabel = `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
    chips.push({ iso, label, sublabel, isToday, isTomorrow });
  }
  return chips;
}

const TIME_SLOTS_MORNING = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
];
const TIME_SLOTS_AFTERNOON = [
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];
const TIME_SLOTS_EVENING = ["18:00", "18:30", "19:00", "19:30", "20:00"];

function formatLongDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const date = new Date(y, m, d);
  return `${WEEKDAY_LABELS[date.getDay()]} ${d} ${MONTH_LABELS[m]}`;
}

function CalendarSheet({
  open,
  onClose,
  selectedISO,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selectedISO: string;
  onPick: (iso: string) => void;
}) {
  const todayISO = toISODate(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const d = selectedISO ? new Date(selectedISO) : new Date();
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    // Monday-first week: shift Sunday to last
    const firstDayIdx = (first.getDay() + 6) % 7;
    const cells: { day: number | null; iso: string | null }[] = [];
    for (let i = 0; i < firstDayIdx; i += 1) cells.push({ day: null, iso: null });
    for (let d = 1; d <= lastDate; d += 1) {
      cells.push({
        day: d,
        iso: `${year}-${pad(month + 1)}-${pad(d)}`,
      });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
    return cells;
  }, [year, month]);

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.calendarBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={styles.calendarSheet}
        >
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => setViewDate(new Date(year, month - 1, 1))}
              style={styles.calendarNav}
              hitSlop={10}
            >
              <Feather name="chevron-left" size={18} color="#0F172A" />
            </Pressable>
            <Text style={styles.calendarTitle}>
              {MONTH_LABELS[month]} {year}
            </Text>
            <Pressable
              onPress={() => setViewDate(new Date(year, month + 1, 1))}
              style={styles.calendarNav}
              hitSlop={10}
            >
              <Feather name="chevron-right" size={18} color="#0F172A" />
            </Pressable>
          </View>
          <View style={styles.calendarWeekHeader}>
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <Text key={i} style={styles.calendarWeekLabel}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {grid.map((cell, idx) => {
              const isSel = cell.iso === selectedISO;
              const isPast =
                cell.iso !== null && cell.iso < todayISO;
              const isToday = cell.iso === todayISO;
              if (!cell.day) {
                return <View key={idx} style={styles.calendarCell} />;
              }
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    if (isPast) return;
                    if (cell.iso) onPick(cell.iso);
                  }}
                  style={styles.calendarCell}
                  disabled={isPast}
                >
                  <View
                    style={[
                      styles.calendarDay,
                      isSel && styles.calendarDaySelected,
                      isToday && !isSel && styles.calendarDayToday,
                      isPast && styles.calendarDayPast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSel && styles.calendarDayTextSelected,
                        isPast && styles.calendarDayTextPast,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.calendarCloseBtn} onPress={onClose}>
            <Text style={styles.calendarCloseText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const QUICK_TIME_SLOTS = new Set<string>([
  ...TIME_SLOTS_MORNING,
  ...TIME_SLOTS_AFTERNOON,
  ...TIME_SLOTS_EVENING,
]);

function TimeSheet({
  open,
  initial,
  onClose,
  onPick,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onPick: (hhmm: string) => void;
}) {
  const [hh, setHh] = useState(() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(initial);
    return m ? Math.min(23, Math.max(0, Number(m[1]))) : 14;
  });
  const [mm, setMm] = useState(() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(initial);
    return m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  });

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    [],
  );
  const minutes = useMemo(
    () => [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
    [],
  );
  const value = `${pad(hh)}:${pad(mm)}`;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.calendarBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={[styles.calendarSheet, { maxWidth: 420 }]}
        >
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Heure du rendez-vous</Text>
            <Pressable
              onPress={onClose}
              style={styles.calendarNav}
              hitSlop={10}
            >
              <Feather name="x" size={18} color="#0F172A" />
            </Pressable>
          </View>

          <View style={styles.timePickerPreviewWrap}>
            <Text style={styles.timePickerPreview}>{value}</Text>
          </View>

          <View>
            <Text style={styles.timeBlockLabel}>Heure</Text>
            <View style={styles.timeChipRow}>
              {hours.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setHh(h)}
                  style={[
                    styles.timePadCell,
                    hh === h && styles.timePadCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePadText,
                      hh === h && styles.timePadTextSelected,
                    ]}
                  >
                    {pad(h)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.timeBlockLabel}>Minutes (pas de 5)</Text>
            <View style={styles.timeChipRow}>
              {minutes.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMm(m)}
                  style={[
                    styles.timePadCell,
                    mm === m && styles.timePadCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePadText,
                      mm === m && styles.timePadTextSelected,
                    ]}
                  >
                    {pad(m)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={styles.timeConfirmBtn}
            onPress={() => {
              onPick(value);
              onClose();
            }}
          >
            <Feather name="check" size={15} color="#FFFFFF" />
            <Text style={styles.timeConfirmText}>
              Confirmer {value}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RdvQuickPickerImpl({
  rdvDate,
  rdvTime,
  onChangeDate,
  onChangeTime,
}: RdvQuickPickerProps) {
  const chips = useMemo(() => buildDayChips(10), []);
  const isInChips = chips.some((c) => c.iso === rdvDate);
  const isCustomTime = rdvTime ? !QUICK_TIME_SLOTS.has(rdvTime) : false;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="calendar" size={13} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Date du rendez-vous</Text>
            <Text style={styles.sectionPick}>{formatLongDate(rdvDate)}</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map((chip) => {
            const isSel = rdvDate === chip.iso;
            return (
              <Pressable
                key={chip.iso}
                onPress={() => onChangeDate(chip.iso)}
                style={[
                  styles.dateChip,
                  isSel && styles.dateChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dateChipLabel,
                    isSel && styles.dateChipLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[
                    styles.dateChipSub,
                    isSel && styles.dateChipSubSelected,
                  ]}
                  numberOfLines={1}
                >
                  {chip.sublabel}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={[
              styles.dateChipMore,
              !isInChips && styles.dateChipMoreActive,
            ]}
          >
            <Feather
              name="calendar"
              size={14}
              color={!isInChips ? "#FFFFFF" : "#0F172A"}
            />
            <Text
              style={[
                styles.dateChipMoreLabel,
                !isInChips && styles.dateChipMoreLabelActive,
              ]}
            >
              {!isInChips ? formatLongDate(rdvDate) : "Autre date"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: "#FFF7ED" }]}>
            <Feather name="clock" size={13} color="#C2410C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Heure</Text>
            <Text style={styles.sectionPick}>{rdvTime || "—"}</Text>
          </View>
        </View>
        <View style={styles.timeBlocks}>
          {[
            { label: "Matinée", slots: TIME_SLOTS_MORNING },
            { label: "Après-midi", slots: TIME_SLOTS_AFTERNOON },
            { label: "Soir", slots: TIME_SLOTS_EVENING },
          ].map((block) => (
            <View key={block.label}>
              <Text style={styles.timeBlockLabel}>{block.label}</Text>
              <View style={styles.timeChipRow}>
                {block.slots.map((slot) => {
                  const isSel = rdvTime === slot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => onChangeTime(slot)}
                      style={[
                        styles.timeChip,
                        isSel && styles.timeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSel && styles.timeChipTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => setTimeSheetOpen(true)}
            style={[
              styles.timeChip,
              styles.customTimeChip,
              isCustomTime && styles.customTimeChipActive,
            ]}
          >
            <Feather
              name="edit-3"
              size={13}
              color={isCustomTime ? "#FFFFFF" : "#0F172A"}
            />
            <Text
              style={[
                styles.timeChipText,
                styles.customTimeChipText,
                isCustomTime && styles.timeChipTextSelected,
              ]}
            >
              {isCustomTime ? rdvTime : "Autre heure"}
            </Text>
          </Pressable>
        </View>
      </View>

      <TimeSheet
        open={timeSheetOpen}
        initial={rdvTime}
        onClose={() => setTimeSheetOpen(false)}
        onPick={onChangeTime}
      />

      <CalendarSheet
        open={calendarOpen}
        selectedISO={rdvDate}
        onClose={() => setCalendarOpen(false)}
        onPick={(iso) => {
          onChangeDate(iso);
          setCalendarOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  sectionPick: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  chipRow: {
    paddingVertical: 2,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAECEF",
    alignItems: "center",
    gap: 2,
    minWidth: 96,
  },
  dateChipSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  dateChipLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  dateChipLabelSelected: {
    color: "#FFFFFF",
  },
  dateChipSub: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  dateChipSubSelected: {
    color: "rgba(255,255,255,0.7)",
  },
  dateChipMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAECEF",
  },
  dateChipMoreActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  dateChipMoreLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateChipMoreLabelActive: {
    color: "#FFFFFF",
  },
  timeBlocks: {
    gap: 12,
  },
  timeBlockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  timeChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAECEF",
    minWidth: 70,
    alignItems: "center",
  },
  timeChipSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  timeChipText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
  timeChipTextSelected: {
    color: "#FFFFFF",
  },
  customTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  customTimeChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  customTimeChipText: {
    fontSize: 12.5,
  },
  timePickerPreviewWrap: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timePickerPreview: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
  },
  timePadCell: {
    minWidth: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EAECEF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  timePadCellSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  timePadText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
  },
  timePadTextSelected: {
    color: "#FFFFFF",
  },
  timeConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#0F172A",
  },
  timeConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  // ── Calendar sheet ─────────────────────────────────────────
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  calendarSheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
    textTransform: "capitalize",
  },
  calendarWeekHeader: {
    flexDirection: "row",
  },
  calendarWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  calendarDay: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayToday: {
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  calendarDaySelected: {
    backgroundColor: "#0F172A",
  },
  calendarDayPast: {
    opacity: 0.35,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  calendarDayTextPast: {
    color: "#94A3B8",
  },
  calendarCloseBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calendarCloseText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
});

export default memo(RdvQuickPickerImpl);
