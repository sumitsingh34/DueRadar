import { router } from 'expo-router';

/** Goes back, or home when there is no history (e.g. a web page opened directly). */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
