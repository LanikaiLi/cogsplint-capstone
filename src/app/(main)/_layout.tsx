import { Slot } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { colors } from '@/theme';

// Layout for everything after login: the top switcher, then the chosen sub-product.
export default function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <Slot />
    </View>
  );
}
