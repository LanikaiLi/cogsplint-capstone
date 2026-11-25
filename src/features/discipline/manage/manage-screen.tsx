import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDisciplines } from '@/features/discipline/shared/task-read-api';
import { TIME_BLOCKS } from '@/features/discipline/shared/time-blocks';
import { colors, fonts, radius } from '@/theme';

// Manage tab: the user's own task list, grouped by time of day.
export default function ManageScreen() {
  const router = useRouter();
  const { data: tasks, isLoading, isError, refetch, isRefetching } = useDisciplines();

  function openForm(id?: string) {
    if (id) {
      router.push({ pathname: '/task-form', params: { id } });
    } else {
      router.push('/task-form');
    }
  }

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
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No tasks yet</Text>
        <Text style={styles.emptyNote}>Add what you want to do each day. Your tasks show up in Today.</Text>
        <Pressable style={styles.primaryButton} onPress={() => openForm()} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Add your first task</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => {
            refetch();
          }} tintColor={colors.primary} />
      }>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Your tasks</Text>
        <Pressable style={styles.newButton} onPress={() => openForm()} accessibilityRole="button">
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </View>

      {TIME_BLOCKS.map((block) => {
        const blockTasks = tasks.filter((task) => task.time_block === block.value);
        if (blockTasks.length === 0) {
          return null;
        }
        return (
          <View key={block.value} style={styles.group}>
            <Text style={styles.groupTitle}>{block.label}</Text>
            {blockTasks.map((task) => (
              <Pressable
                key={task.id}
                style={styles.card}
                onPress={() => openForm(task.id)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${task.title}`}>
                <Text style={styles.cardTitle}>{task.title}</Text>
                <Text style={styles.cardPoints}>+{task.points}</Text>
              </Pressable>
            ))}
          </View>
        );
      })}
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
    marginBottom: 16,
  },
  heading: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  newButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  newButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
  group: { marginBottom: 20 },
  groupTitle: {
    marginBottom: 8,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
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
});
