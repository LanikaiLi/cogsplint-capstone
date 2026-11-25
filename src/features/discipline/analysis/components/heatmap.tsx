import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { heatLevel, type DayStat } from '@/features/discipline/analysis/analysis-logic';
import { colors, fonts, radius } from '@/theme';

// Lightest to darkest. All calm teal shades, no red.
const SHADES = ['#E6ECEE', '#C4DFE0', '#8CC1C4', '#4A9599', colors.primary];

// One small square per day (oldest first, today last), shaded by how much of that day's list was done.
export function Heatmap({
  days,
  selected,
  onSelect,
  detail,
}: {
  days: DayStat[];
  selected: string | null;
  onSelect: (date: string | null) => void;
  // The card shown under the squares for the selected day.
  detail?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily progress · last 12 weeks · tap a day</Text>
      <View style={styles.grid}>
        {days.map((day) => (
          <Pressable
            key={day.date}
            style={styles.cellBox}
            onPress={() => onSelect(selected === day.date ? null : day.date)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${day.date}`}>
            <View
              style={[
                styles.cell,
                { backgroundColor: SHADES[heatLevel(day)] },
                selected === day.date && styles.cellSelected,
              ]}
            />
          </Pressable>
        ))}
      </View>
      {detail}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {SHADES.map((shade) => (
          <View key={shade} style={[styles.legendCell, { backgroundColor: shade }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { marginBottom: 10, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // 12 columns: each box is 1/12 of the width, with the square inside leaving a small gap.
  cellBox: { width: `${100 / 12}%`, padding: 2 },
  cell: { aspectRatio: 1, borderRadius: 3, borderWidth: 2, borderColor: 'transparent' },
  cellSelected: { borderColor: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  legendText: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
});
