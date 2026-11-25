import { StyleSheet, Text, View } from 'react-native';

import type { TaskStat } from '@/features/discipline/analysis/analysis-logic';
import { colors, fonts, radius } from '@/theme';

// For each task: on how many of the last 30 days it was done, and that as a percent.
export function TaskStats({ stats }: { stats: TaskStat[] }) {
  if (stats.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Each task · last 30 days</Text>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {stat.title}
            </Text>
            <Text style={styles.numbers}>
              {stat.done === 0 ? 'Not done yet' : `${stat.done} ${stat.done === 1 ? 'day' : 'days'} done · ${stat.rate}%`}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${stat.rate}%` }]} />
          </View>
        </View>
      ))}
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
  row: { marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { flex: 1, marginRight: 12, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  numbers: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  track: { height: 6, marginTop: 6, borderRadius: radius.pill, backgroundColor: '#E6ECEE', overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
});
