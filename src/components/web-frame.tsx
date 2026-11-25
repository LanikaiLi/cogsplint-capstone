import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

// On a wide computer screen the app would stretch edge to edge, so in the web browser we keep it
// phone-sized and centered. On the phone app this does nothing.
export function WebFrame({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') {
    return children;
  }
  return (
    <View style={styles.page}>
      <View style={styles.app}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: '#E6ECEE' },
  app: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: colors.background },
});
