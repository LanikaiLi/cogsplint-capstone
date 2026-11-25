import { Stack } from 'expo-router';

// The logged-out part of the app. Today it only has the sign-in page.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
