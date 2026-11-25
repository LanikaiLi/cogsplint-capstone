import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DialogHost } from '@/components/dialog-host';
import { monthKey } from '@/features/discipline/jar/jar-logic';
import { colors, fonts, radius } from '@/theme';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A small calendar: pick a year, then a month. Months with rewards are highlighted.
// Every month can be tapped; the screen explains if there is nothing to show.
export function MonthPicker({
  visible,
  monthsWithRewards,
  registrationMonth,
  currentMonth,
  onPick,
  onClose,
}: {
  visible: boolean;
  monthsWithRewards: string[];
  registrationMonth: string;
  currentMonth: string;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const firstYear = Number(registrationMonth.slice(0, 4));
  const lastYear = Number(currentMonth.slice(0, 4));
  const [year, setYear] = useState(lastYear);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* The inner Pressable stops taps on the sheet from closing it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.yearRow}>
            <Pressable
              onPress={() => setYear(year - 1)}
              disabled={year <= firstYear}
              style={styles.yearButton}
              accessibilityRole="button"
              accessibilityLabel="Previous year">
              <Text style={[styles.yearArrow, year <= firstYear && styles.yearArrowOff]}>‹</Text>
            </Pressable>
            <Text style={styles.year}>{year}</Text>
            <Pressable
              onPress={() => setYear(year + 1)}
              disabled={year >= lastYear}
              style={styles.yearButton}
              accessibilityRole="button"
              accessibilityLabel="Next year">
              <Text style={[styles.yearArrow, year >= lastYear && styles.yearArrowOff]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {SHORT_MONTHS.map((name, index) => {
              const key = monthKey(year, index);
              const hasRewards = monthsWithRewards.includes(key);
              return (
                <Pressable
                  key={key}
                  style={styles.month}
                  onPress={() => onPick(key)}
                  accessibilityRole="button">
                  <Text style={[styles.monthText, hasRewards ? styles.monthTextOn : styles.monthTextOff]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>Months with rewards are highlighted.</Text>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
      {/* This window sits on top of everything, so popups opened from it are drawn here. */}
      <DialogHost level={2} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '100%', maxWidth: 440, padding: 20, borderRadius: radius.medium, backgroundColor: colors.background },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearButton: { paddingHorizontal: 16, paddingVertical: 4 },
  yearArrow: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  yearArrowOff: { color: colors.border },
  year: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -4 },
  month: {
    width: '33.33%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  monthText: {
    paddingVertical: 12,
    textAlign: 'center',
    borderRadius: radius.small,
    borderWidth: 1,
    overflow: 'hidden',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  monthTextOn: { color: colors.primary, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  monthTextOff: { color: colors.textMuted, borderColor: colors.border, backgroundColor: colors.surface },
  hint: { marginTop: 12, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  close: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 8 },
  closeText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
});
