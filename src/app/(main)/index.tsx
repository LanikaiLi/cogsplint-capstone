import { Redirect } from 'expo-router';

// This is the default page of the (main) folder, so it is what opens right after login.
// It shows nothing itself: it sends the user straight to Daily Discipline (discipline/).
export default function MainIndex() {
  return <Redirect href="/discipline" />;
}
