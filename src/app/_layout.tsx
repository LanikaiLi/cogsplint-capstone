import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { WorkSans_400Regular } from '@expo-google-fonts/work-sans/400Regular';
import { WorkSans_500Medium } from '@expo-google-fonts/work-sans/500Medium';
import { WorkSans_600SemiBold } from '@expo-google-fonts/work-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DialogHost } from '@/components/dialog-host';
import { WebFrame } from '@/components/web-frame';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { colors } from '@/theme';

// Keep the splash screen up until fonts and the saved login are ready.
SplashScreen.preventAutoHideAsync();

// Keeps server data (like the task list) in memory so every screen shows the same, fresh list.
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Lora_600SemiBold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  // If a font fails to load we still start the app (with the system font).
  const ready = !isLoading && (fontsLoaded || fontError);
  if (!ready) {
    return null;
  }
  SplashScreen.hide();

  return (
    <>
      <StatusBar style="dark" />
      <WebFrame>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          {/* Logged-out users can only reach the login screen. */}
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* Logged-in users get the main app. */}
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(main)" />
            <Stack.Screen name="task-form" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reward-form" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
        {/* The app's popup, for the main screens. */}
        <DialogHost />
      </WebFrame>
    </>
  );
}
