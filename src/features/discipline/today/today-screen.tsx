import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';
import { usePointsBalance } from '@/features/discipline/jar/jar-api';
import { canUndoCheckIn } from '@/features/discipline/jar/jar-logic';
import { localDateString } from '@/features/discipline/shared/date-logic';
import { useDisciplines } from '@/features/discipline/shared/task-read-api';
import { useCheckIns, useToggleCheckIn, type CheckIn } from '@/features/discipline/today/today-api';
import {
  countDone,
  currentTimeBlock,
  groupByTimeBlock,
  isPastBlock,
} from '@/features/discipline/today/today-logic';
import { ProgressRing } from '@/features/discipline/today/components/progress-ring';
import { colors, fonts, radius } from '@/theme';
import { showDialog } from '@/lib/dialog';

// There is no profile page yet, so Log out lives on Today (in every state of the page).
function LogOutButton() {
  const { logOut } = useAuth();
  return (
    <Pressable style={styles.logOut} onPress={logOut} accessibilityRole="button">
      <Text style={styles.logOutText}>Log out</Text>
    </Pressable>
  );
}

// Today tab: today's tasks grouped by time of day, with progress.
export default function TodayScreen() {
  const router = useRouter();
  const { data: tasks, isLoading, isError, refetch, isRefetching } = useDisciplines();

  const now = new Date();
  const today = localDateString(now);
  const { data: checkIns = [] } = useCheckIns(today);
  const toggle = useToggleCheckIn(today);
  const { data: balance } = usePointsBalance();

  function onTaskPress(task: { id: string; points: number }, existing?: CheckIn) {
    // Undoing must not push the balance below 0: those points may already be spent on a reward.
    if (existing && balance !== undefined && !canUndoCheckIn(balance, existing.points_earned)) {
      showDialog(
        "Can't undo this one yet",
        "You've already spent these points on a reward. Undoing this check-in would put your balance below zero.\n\nTo undo it, first delete a reward in Rewards to get points back.",
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Rewards', onPress: () => router.navigate('/discipline/jar') },
        ],
      );
      return;
    }
    toggle.mutate({ disciplineId: task.id, existing, points: task.points });
  }
  const nowBlock = currentTimeBlock(now);
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !tasks) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>We could not load your tasks.</Text>
        <Text style={styles.emptyNote}>Please check your connection and try again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => refetch()} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <LogOutButton />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Nothing planned yet</Text>
        <Text style={styles.emptyNote}>Add the tasks you want to do each day, and they will show up here.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/discipline/manage')}
          accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Go to Manage</Text>
        </Pressable>
        <LogOutButton />
      </View>
    );
  }

  // A task is done today if it has a check-in for today's date.
  const checkInByTask = new Map(checkIns.map((log) => [log.discipline_id, log]));
  const doneCount = countDone(tasks, checkIns);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Today</Text>
          <Text style={styles.date}>{dateText}</Text>
        </View>
        <ProgressRing done={doneCount} total={tasks.length} />
      </View>

      {groupByTimeBlock(tasks).map((block) => {
        const blockTasks = block.tasks;
        const isNow = block.value === nowBlock;
        // Earlier in the day and still open: soften it, no warnings.
        const isPast = isPastBlock(block.value, nowBlock);
        return (
          <View key={block.value} style={[styles.group, isPast && styles.groupPast]}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{block.label}</Text>
              {isNow && (
                <View style={styles.nowBadge}>
                  <Text style={styles.nowBadgeText}>Now</Text>
                </View>
              )}
            </View>
            {blockTasks.map((task) => {
              const existing = checkInByTask.get(task.id);
              const isDone = !!existing;
              return (
                <Pressable
                  key={task.id}
                  style={[styles.card, isNow && styles.cardNow, isDone && styles.cardDone]}
                  onPress={() => onTaskPress(task, existing)}
                  accessibilityRole="button"
                  accessibilityLabel={`${isDone ? 'Undo' : 'Mark done'}: ${task.title}`}>
                  <View style={[styles.check, isDone && styles.checkDone]}>
                    {isDone && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]}>{task.title}</Text>
                  <Text style={[styles.cardPoints, isDone && styles.cardTitleDone]}>+{task.points}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <LogOutButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  date: { marginTop: 2, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  group: { marginBottom: 20 },
  groupPast: { opacity: 0.6 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  groupTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  nowBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  nowBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: '#FFFFFF' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardNow: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardDone: { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.7 },
  check: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontFamily: fonts.bodySemiBold },
  cardTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  cardTitle: { flex: 1, marginRight: 12, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  cardPoints: { fontFamily: fonts.heading, fontSize: 14, color: colors.primary },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, textAlign: 'center' },
  emptyNote: {
    marginTop: 8,
    marginBottom: 24,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#FFFFFF' },
  logOut: { alignSelf: 'center', marginTop: 16, paddingVertical: 10, paddingHorizontal: 16 },
  logOutText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
});
