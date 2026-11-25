import { StyleSheet, Text, View } from 'react-native';

import type { DayDetail } from '@/features/discipline/analysis/analysis-logic';
import { colors, fonts, radius } from '@/theme';

// What happened on the day the user tapped in the heatmap: the date, the completion, and each task.
export function DayDetailCard({ detail }: { detail: DayDetail }) {
  const label = new Date(`${detail.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const percent = detail.total === 0 ? 0 : Math.round((detail.done / detail.total) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{label}</Text>
        {detail.total > 0 && (
          <Text style={styles.summary}>
            {detail.done} of {detail.total} {detail.total === 1 ? 'task' : 'tasks'} · {percent}%
          </Text>
        )}
      </View>
      {detail.total === 0 ? (
        <Text style={styles.empty}>No tasks on this day.</Text>
      ) : (
        detail.tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[styles.mark, task.done && styles.markDone]}>
              {task.done && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={[styles.taskTitle, !task.done && styles.taskTitleMuted]}>{task.title}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: radius.small,
    backgroundColor: colors.primarySoft,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  date: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  summary: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  mark: {
    width: 18,
    height: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  markDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  check: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: '#FFFFFF' },
  taskTitle: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  taskTitleMuted: { color: colors.textMuted },
});
