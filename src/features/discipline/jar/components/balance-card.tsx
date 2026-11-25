import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSaveExchangeRate } from '@/features/discipline/jar/jar-api';
import { formatMoney, moneyEquivalent, parseExchangeRate } from '@/features/discipline/jar/jar-logic';
import { colors, fonts, radius } from '@/theme';

// The top card of Jar: points balance, what it is worth in money, and the exchange rate (editable).
export function BalanceCard({ balance, rate }: { balance: number; rate: number }) {
  const save = useSaveExchangeRate();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(rate));
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setText(String(rate));
    setMessage(null);
    setEditing(true);
  }

  async function onSave() {
    const value = parseExchangeRate(text);
    if (value === null) {
      setMessage('Please enter a number greater than 0.');
      return;
    }
    try {
      await save.mutateAsync(value);
      setMessage(null);
      setEditing(false);
    } catch {
      setMessage('We could not save the exchange rate. Please try again.');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Points balance</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.balance}>{balance}</Text>
        <Text style={styles.unit}>points</Text>
      </View>
      <Text style={styles.money}>≈ {formatMoney(moneyEquivalent(balance, rate))}</Text>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            autoFocus
            maxLength={9}
            accessibilityLabel="Points per dollar"
          />
          <Text style={styles.rateText}>points = $1</Text>
          <Pressable onPress={onSave} disabled={save.isPending} accessibilityRole="button">
            {save.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.action}>Save</Text>
            )}
          </Pressable>
          <Pressable onPress={() => {
              setMessage(null);
              setEditing(false);
            }}
            disabled={save.isPending} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.rateRow}>
          <Text style={styles.rateText}>Exchange rate: {rate} points = $1</Text>
          <Pressable onPress={startEditing} accessibilityRole="button" accessibilityLabel="Edit exchange rate">
            <Text style={styles.action}>Edit</Text>
          </Pressable>
        </View>
      )}
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  balance: { fontFamily: fonts.heading, fontSize: 40, color: colors.text },
  unit: { marginLeft: 8, fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  money: { marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.primary },
  rateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  rateText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  input: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  action: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  message: { marginTop: 10, fontFamily: fonts.body, fontSize: 13, color: colors.notice },
});
