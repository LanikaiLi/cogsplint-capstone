import { useRouter, type Href } from 'expo-router';

// Closes a slide-up screen. Normally we just go back. But in the web browser someone can refresh the
// page or open its link directly, and then there is nothing to go back to, so we go to `fallback`.
export function useCloseScreen(fallback: Href) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };
}
