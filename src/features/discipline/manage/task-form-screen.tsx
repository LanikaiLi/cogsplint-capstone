import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogHost } from '@/components/dialog-host';
import { useDeleteDiscipline, useSaveDiscipline } from '@/features/discipline/manage/task-write-api';
import { useDisciplines, type Discipline } from '@/features/discipline/shared/task-read-api';
import { TIME_BLOCKS, type TimeBlock } from '@/features/discipline/shared/time-blocks';
import { colors, fonts, radius } from '@/theme';
import { useCloseScreen } from '@/lib/use-close-screen';
import { showDialog } from '@/lib/dialog';

// Add or edit a task. Opened from Manage as a sheet that slides up.
// With an `id` in the link it edits that task, without one it creates a new task.
export default function TaskFormScreen() {
  const close = useCloseScreen('/discipline/manage');
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: tasks, isLoading } = useDisciplines();

  if (id && isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const task = id ? tasks?.find((t) => t.id === id) : undefined;
  if (id && !task) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>This task is no longer available.</Text>
        <Pressable style={styles.textButton} onPress={close} accessibilityRole="button">
          <Text style={styles.textButtonLabel}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return <TaskForm task={task} />;
}

function TaskForm({ task }: { task?: Discipline }) {
  const close = useCloseScreen('/discipline/manage');
  const insets = useSafeAreaInsets();
  const save = useSaveDiscipline();
  const remove = useDeleteDiscipline();

  const [title, setTitle] = useState(task?.title ?? '');
  const [points, setPoints] = useState(task ? String(task.points) : '10');
  const [timeBlock, setTimeBlock] = useState<TimeBlock>(task?.time_block ?? 'morning');
  const [message, setMessage] = useState<string | null>(null);

  const busy = save.isPending || remove.isPending;

  async function onSave() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setMessage('Please give your task a name.');
      return;
    }
    setMessage(null);
    try {
      await save.mutateAsync({
        id: task?.id,
        input: { title: cleanTitle, points: parseInt(points || '0', 10), time_block: timeBlock },
      });
      close();
    } catch {
      setMessage('We could not save your task. Please try again.');
    }
  }

  function onDelete() {
    if (!task) {
      return;
    }
    showDialog(
      'Delete this task?',
      "It will leave Today from now on. Your past check-ins and points stay in your history. If you want it again later, you'll need to create it as a new task.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await remove.mutateAsync(task.id);
              close();
            } catch {
              setMessage('We could not delete your task. Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={close} disabled={busy} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.heading}>{task ? 'Edit task' : 'New task'}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.label}>Task name</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Morning walk"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          autoFocus={!task}
        />

        <Text style={styles.label}>Points</Text>
        <TextInput
          style={styles.input}
          value={points}
          onChangeText={(value) => setPoints(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          maxLength={9}
        />

        <Text style={styles.label}>Time of day</Text>
        <View style={styles.pills}>
          {TIME_BLOCKS.map((block) => {
            const selected = block.value === timeBlock;
            return (
              <Pressable
                key={block.value}
                onPress={() => setTimeBlock(block.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.pill, selected && styles.pillSelected]}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{block.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {message && <Text style={styles.message}>{message}</Text>}

        <Pressable
          style={[styles.saveButton, busy && styles.saveButtonBusy]}
          onPress={onSave}
          disabled={busy}
          accessibilityRole="button">
          {save.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>

        {task && (
          <Pressable style={styles.textButton} onPress={onDelete} disabled={busy} accessibilityRole="button">
            <Text style={styles.textButtonLabel}>Delete task</Text>
          </Pressable>
        )}
      </ScrollView>
      {/* This screen slides up over the app, so it needs its own popup layer. */}
      <DialogHost level={1} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.surface,
  },
  centerText: { fontFamily: fonts.body, fontSize: 16, color: colors.text, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cancel: { width: 64, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  topBarSpacer: { width: 64 },
  heading: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  label: { marginBottom: 6, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  input: {
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  pillTextSelected: { color: colors.primary },
  message: {
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.notice,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  saveButtonBusy: { opacity: 0.7 },
  saveButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#FFFFFF' },
  textButton: { alignItems: 'center', marginTop: 20, padding: 8 },
  textButtonLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textMuted },
});
