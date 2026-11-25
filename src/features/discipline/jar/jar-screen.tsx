import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceCard } from '@/features/discipline/jar/components/balance-card';
import { PhotoViewer } from '@/features/discipline/jar/components/photo-viewer';
import { PointsChart } from '@/features/discipline/jar/components/points-chart';
import { RewardHistory } from '@/features/discipline/jar/components/reward-history';
import {
  useDeleteReward,
  useEarnedByMonth,
  useExchangeRate,
  usePointsBalance,
  useRewards,
  type Reward,
} from '@/features/discipline/jar/jar-api';
import { useAuth } from '@/features/auth/auth-context';
import { colors, fonts, radius } from '@/theme';
import { showDialog } from '@/lib/dialog';

// Rewards tab (called "jar" in the code): points balance, "Treat yourself", and the history of rewards.
export default function JarScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const balance = usePointsBalance();
  const rate = useExchangeRate();
  const rewards = useRewards();
  const earned = useEarnedByMonth();
  const deleteReward = useDeleteReward();
  const [viewing, setViewing] = useState<Reward | null>(null);

  function confirmDelete(reward: Reward) {
    showDialog(
      'Delete this reward?',
      'If you delete this, your points will be returned and this history will no longer be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            deleteReward.mutate(
              { id: reward.id, photoPath: reward.photo_path },
              {
                onError: () => showDialog('We could not delete this reward', 'Please try again.'),
              },
            );
          },
        },
      ],
    );
  }

  if (balance.isLoading || rate.isLoading || rewards.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (balance.data === undefined || rate.data === undefined || !rewards.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>We could not load your rewards.</Text>
        <Text style={styles.emptyNote}>Please check your connection and try again.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            balance.refetch();
            rate.refetch();
            rewards.refetch();
          }}
          accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const isRefreshing = balance.isRefetching || rate.isRefetching || rewards.isRefetching;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            balance.refetch();
            rate.refetch();
            rewards.refetch();
            earned.refetch();
          }}
          tintColor={colors.primary}
        />
      }>
      <BalanceCard balance={balance.data} rate={rate.data} />
      <PointsChart months={earned.data ?? []} />

      <Pressable
        style={styles.treatButton}
        onPress={() => router.push('/reward-form')}
        accessibilityRole="button">
        <Text style={styles.primaryButtonText}>Treat yourself</Text>
      </Pressable>

      <RewardHistory
        rewards={rewards.data}
        registeredAt={session?.user.created_at ?? new Date().toISOString()}
        onDelete={confirmDelete}
        onOpenPhoto={setViewing}
      />
      <PhotoViewer reward={viewing} onClose={() => setViewing(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  treatButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#FFFFFF' },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, textAlign: 'center' },
  emptyNote: {
    marginTop: 4,
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
