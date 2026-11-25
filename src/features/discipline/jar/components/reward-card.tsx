import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reward } from '@/features/discipline/jar/jar-api';
import { colors, fonts, radius } from '@/theme';

// One line of the reward history: what it was, how many points, when, and the note.
export function RewardCard({
  reward,
  onDelete,
  onOpenPhoto,
}: {
  reward: Reward;
  onDelete: () => void;
  onOpenPhoto: () => void;
}) {
  const date = new Date(reward.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {!!reward.photo_url && (
          <Pressable onPress={onOpenPhoto} accessibilityRole="button" accessibilityLabel={`View photo of ${reward.description}`}>
            <Image source={{ uri: reward.photo_url }} style={styles.thumb} contentFit="cover" />
          </Pressable>
        )}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.description}>{reward.description}</Text>
            <Text style={styles.points}>-{reward.points_spent}</Text>
          </View>
          <Text style={styles.date}>{date}</Text>
          {!!reward.reflection && <Text style={styles.reflection}>“{reward.reflection}”</Text>}
        </View>
      </View>
      <Pressable style={styles.delete} onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${reward.description}`}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    padding: 14,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row' },
  thumb: { width: 56, height: 56, marginRight: 12, borderRadius: radius.small, backgroundColor: colors.primarySoft },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  description: { flex: 1, marginRight: 12, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  points: { fontFamily: fonts.heading, fontSize: 14, color: colors.textMuted },
  date: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  delete: { alignSelf: 'flex-end', marginTop: 4, paddingVertical: 4, paddingLeft: 12 },
  deleteText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
  reflection: { marginTop: 8, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.primary },
});
