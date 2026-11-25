import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

// The three headline numbers. A missing average shows a dash, never a zero.
export function StatCards({
  streak,
  averagePercent,
  perfectDays,
}: {
  streak: number;
  averagePercent: number | null;
  perfectDays: number;
}) {
  return (
    <View style={styles.row}>
      <StatCard value={String(streak)} label="Day streak" />
      <StatCard value={averagePercent === null ? '–' : `${averagePercent}%`} label="30-day average" />
      <StatCard value={String(perfectDays)} label="Perfect days" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  value: { fontFamily: fonts.heading, fontSize: 24, color: colors.primary },
  label: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
