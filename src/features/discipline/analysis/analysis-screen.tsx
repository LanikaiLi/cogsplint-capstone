import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAnalysisData } from '@/features/discipline/analysis/analysis-api';
import {
  averageCompletion,
  currentStreak,
  dayDetail,
  dayStats,
  perfectDays,
  taskStats,
} from '@/features/discipline/analysis/analysis-logic';
import { DayDetailCard } from '@/features/discipline/analysis/components/day-detail';
import { Heatmap } from '@/features/discipline/analysis/components/heatmap';
import { StatCards } from '@/features/discipline/analysis/components/stat-cards';
import { TaskStats } from '@/features/discipline/analysis/components/task-stats';
import { localDateString } from '@/features/discipline/shared/date-logic';
import { colors, fonts, radius } from '@/theme';

const HEATMAP_DAYS = 84;
const SUMMARY_DAYS = 30;

// Analysis tab: streak, average completion, perfect days, a heatmap, and a line per task.
export default function AnalysisScreen() {
  const query = useAnalysisData();
  const today = localDateString();
  const [selected, setSelected] = useState<string | null>(null);

  const numbers = useMemo(() => {
    if (!query.data) {
      return null;
    }
    const { tasks, logs } = query.data;
    const heatmapDays = dayStats(tasks, logs, today, HEATMAP_DAYS);
    const lastMonth = heatmapDays.slice(-SUMMARY_DAYS);
    return {
      streak: currentStreak(logs, today),
      average: averageCompletion(lastMonth),
      perfect: perfectDays(lastMonth),
      heatmapDays,
      perTask: taskStats(tasks, logs, today, SUMMARY_DAYS),
      hasCheckIns: logs.length > 0,
    };
  }, [query.data, today]);

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!numbers) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>We could not load your progress.</Text>
        <Text style={styles.note}>Please check your connection and try again.</Text>
        <Pressable style={styles.button} onPress={() => query.refetch()} accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!numbers.hasCheckIns) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Your progress will grow here</Text>
        <Text style={styles.note}>Check off tasks in Today and your progress will show up here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => {
            query.refetch();
          }} tintColor={colors.primary} />
      }>
      <StatCards streak={numbers.streak} averagePercent={numbers.average} perfectDays={numbers.perfect} />
      {numbers.streak === 0 && <Text style={styles.gentle}>Start a new streak today.</Text>}
      <Heatmap
        days={numbers.heatmapDays}
        selected={selected}
        onSelect={setSelected}
        detail={
          selected && query.data ? <DayDetailCard detail={dayDetail(query.data.tasks, query.data.logs, selected)} /> : null
        }
      />
      <TaskStats stats={numbers.perTask} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, textAlign: 'center' },
  note: {
    marginTop: 6,
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  gentle: { marginTop: 12, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary, textAlign: 'center' },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.medium, backgroundColor: colors.primary },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#FFFFFF' },
});
