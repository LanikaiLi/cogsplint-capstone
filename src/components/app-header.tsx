import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';

// Top bar: app name on the left, switcher between the two sub-products on the right.
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const inMind = pathname.startsWith('/mind');

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.brand}>Cogsplint</Text>
      <View style={styles.switcher}>
        <SwitchOption
          label="Daily Discipline"
          active={!inMind}
          onPress={() => router.replace('/discipline')}
        />
        <SwitchOption label="CBT / Mind" active={inMind} onPress={() => router.replace('/mind')} />
      </View>
    </View>
  );
}

function SwitchOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.option, active && styles.optionActive]}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  brand: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  switcher: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: '#DDE5E7',
  },
  option: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  optionActive: { backgroundColor: colors.surface },
  optionText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  optionTextActive: { color: colors.text },
});
