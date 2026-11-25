import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Temporary screen for tabs that are built in later tickets.
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note ?? 'Coming soon.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  note: { marginTop: 8, fontFamily: fonts.body, fontSize: 16, color: colors.textMuted },
});
