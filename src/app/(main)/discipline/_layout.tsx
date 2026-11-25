import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

// Simple shape as a tab icon (no icon library yet). Filled when the tab is selected.
function TabDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: radius.small / 2,
        borderWidth: 2,
        borderColor: focused ? colors.primary : '#A9B4BA',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}
    />
  );
}

// Daily Discipline: four bottom tabs.
export default function DisciplineTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // In the browser the default bar is too short and cuts off the labels.
          ...(Platform.OS === 'web' && { height: 64, paddingBottom: 6 }),
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="manage" options={{ title: 'Manage' }} />
      <Tabs.Screen name="jar" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="analysis" options={{ title: 'Analysis' }} />
    </Tabs>
  );
}
