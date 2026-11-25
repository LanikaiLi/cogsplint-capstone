import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { MonthPicker } from '@/features/discipline/jar/components/month-picker';
import { RewardCard } from '@/features/discipline/jar/components/reward-card';
import type { Reward } from '@/features/discipline/jar/jar-api';
import {
  checkMonth,
  groupRewardsByMonth,
  monthKeyOf,
  monthMessage,
  previousMonths,
  type MonthGroup,
} from '@/features/discipline/jar/jar-logic';
import { colors, fonts, radius } from '@/theme';
import { showDialog } from '@/lib/dialog';

// Two small arrows stacked on top of each other, pointing down (or up when `up` is true).
function DoubleChevron({ up }: { up?: boolean }) {
  const lines = up ? ['3,6 7,2 11,6', '3,11 7,7 11,11'] : ['3,3 7,7 11,3', '3,8 7,12 11,8'];
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      {lines.map((points) => (
        <Polyline
          key={points}
          points={points}
          fill="none"
          stroke={colors.textMuted}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

// The history page lists this month and the 2 months before it. Anything older is reached with "Pick a month".
const EARLIER_MONTHS = 2;
// A month shows its newest rewards first; "Show all" reveals the rest.
const REWARDS_SHOWN = 5;

// The reward history: this month in full, earlier months folded up, and a month picker.
export function RewardHistory({
  rewards,
  registeredAt,
  onDelete,
  onOpenPhoto,
}: {
  rewards: Reward[];
  registeredAt: string;
  onDelete: (reward: Reward) => void;
  onOpenPhoto: (reward: Reward) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  // A month chosen in the picker. While it is set, the list shows only that month.
  const [viewing, setViewing] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Months whose full list is open.
  const [showAll, setShowAll] = useState<string[]>([]);

  const currentMonth = monthKeyOf(new Date().toISOString());
  const registrationMonth = monthKeyOf(registeredAt);
  const groups = groupRewardsByMonth(rewards);
  const monthsWithRewards = groups.map((group) => group.key);

  const thisMonth = groups.find((group) => group.key === currentMonth);
  const recentKeys = previousMonths(currentMonth, EARLIER_MONTHS);
  const earlier = groups.filter((group) => recentKeys.includes(group.key));
  const viewingGroup = viewing ? groups.find((group) => group.key === viewing) : undefined;

  function toggle(key: string) {
    setExpanded((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  function pickMonth(key: string) {
    const check = checkMonth(key, monthsWithRewards, registrationMonth);
    if (check !== 'ok') {
      const message = monthMessage(check, key, registrationMonth);
      showDialog(message.title, message.body);
      return;
    }
    setPickerOpen(false);
    // The current month is already on the main list, so go back to it.
    setViewing(key === currentMonth ? null : key);
  }

  function toggleShowAll(key: string) {
    setShowAll((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  function renderRewards(group: MonthGroup<Reward>) {
    const isAllShown = showAll.includes(group.key);
    const shown = isAllShown ? group.rewards : group.rewards.slice(0, REWARDS_SHOWN);
    return (
      <>
        {shown.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            onDelete={() => onDelete(reward)}
            onOpenPhoto={() => onOpenPhoto(reward)}
          />
        ))}
        {group.rewards.length > REWARDS_SHOWN && (
          <Pressable style={styles.showAll} onPress={() => toggleShowAll(group.key)} accessibilityRole="button">
            <Text style={styles.showAllText}>
              {isAllShown ? 'Show fewer' : `Show all ${group.rewards.length} rewards`}
            </Text>
            <DoubleChevron up={isAllShown} />
          </Pressable>
        )}
      </>
    );
  }

  const picker = (
    <MonthPicker
      visible={pickerOpen}
      monthsWithRewards={monthsWithRewards}
      registrationMonth={registrationMonth}
      currentMonth={currentMonth}
      onPick={pickMonth}
      onClose={() => setPickerOpen(false)}
    />
  );

  if (viewingGroup) {
    return (
      <View>
        <Pressable style={styles.back} onPress={() => setViewing(null)} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back to recent rewards</Text>
        </Pressable>
        <View style={styles.monthTitleRow}>
          <Text style={styles.monthTitle}>{viewingGroup.label}</Text>
          <Text style={styles.monthNote}>
            {viewingGroup.rewards.length} {viewingGroup.rewards.length === 1 ? 'reward' : 'rewards'} · -
            {viewingGroup.pointsSpent} pts
          </Text>
        </View>
        {renderRewards(viewingGroup)}
        <Pressable style={styles.pickButton} onPress={() => setPickerOpen(true)} accessibilityRole="button">
          <Text style={styles.pickButtonText}>Pick another month</Text>
        </Pressable>
        {picker}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Reward history</Text>

      <View style={styles.monthTitleRow}>
        <Text style={styles.monthTitle}>This month</Text>
        {!!thisMonth && (
          <Text style={styles.monthNote}>
            {thisMonth.rewards.length} {thisMonth.rewards.length === 1 ? 'reward' : 'rewards'}
          </Text>
        )}
      </View>
      {thisMonth ? (
        renderRewards(thisMonth)
      ) : (
        <Text style={styles.emptyNote}>
          {rewards.length === 0
            ? 'Nothing here yet. Spend some points on something that shows love for yourself.'
            : 'No rewards this month yet.'}
        </Text>
      )}

      {earlier.length > 0 && <Text style={[styles.sectionTitle, styles.earlierTitle]}>Earlier</Text>}
      {earlier.map((group) => {
        const isOpen = expanded.includes(group.key);
        return (
          <View key={group.key}>
            <Pressable
              style={styles.monthHeader}
              onPress={() => toggle(group.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}>
              <View>
                <Text style={styles.monthHeaderTitle}>{group.label}</Text>
                <Text style={styles.monthNote}>
                  {group.rewards.length} {group.rewards.length === 1 ? 'reward' : 'rewards'} · -{group.pointsSpent} pts
                </Text>
              </View>
              <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {isOpen && renderRewards(group)}
          </View>
        );
      })}

      <Pressable style={styles.pickButton} onPress={() => setPickerOpen(true)} accessibilityRole="button">
        <Text style={styles.pickButtonText}>Pick a month</Text>
      </Pressable>

      {picker}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginBottom: 10, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  earlierTitle: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  showAll: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 16 },
  showAllText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  back: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4 },
  backText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
  monthTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  monthTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  monthNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  monthHeaderTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  chevron: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.textMuted },
  emptyNote: {
    marginTop: 4,
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  pickButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
});
