import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Image, Modal, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Button } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { onDataChanged } from '@/db/events';
import { getSettings } from '@/db/settings';
import { useTheme } from '@/hooks/use-theme';
import { authenticate, canUseAppLock } from '@/security/app-lock';

/** After this long in the background, the app locks again. */
const LOCK_AFTER_MS = 60 * 1000;

/**
 * When the app lock is on, covers the app until the user unlocks it: at
 * launch, and when coming back after a minute or more away. While the app is
 * away it's covered too, so its content doesn't show in the app switcher or
 * for a moment on return. It also hides the splash screen once it knows
 * whether to lock, so nothing shows before the lock.
 */
export function AppLock() {
  const db = useSQLiteContext();
  const theme = useTheme();
  // Null until the setting is loaded.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(true);
  const [covered, setCovered] = useState(false);
  const enabledRef = useRef(false);
  const backgroundSince = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const result = await authenticate('Unlock DueRadar');
      if (result === 'success') setLocked(false);
      // The phone has no screen lock any more, so there's no way to unlock: open up.
      if (result === 'unavailable') {
        enabledRef.current = false;
        setEnabled(false);
        setLocked(false);
      }
    } catch (error) {
      console.warn('Could not unlock', error);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let firstLoad = true;
    const load = async () => {
      const settings = await getSettings(db);
      // Without a screen lock on the phone there's no way to unlock, so don't lock.
      const usable = settings.appLock && (await canUseAppLock());
      if (!active) return;
      enabledRef.current = usable;
      setEnabled(usable);
      if (!usable) {
        setLocked(false);
      } else if (firstLoad) {
        // At launch, ask straight away. Turning the lock on later doesn't lock
        // the app: the user has just unlocked to do it.
        unlock();
      }
      firstLoad = false;
    };
    const reload = () => {
      load().catch((error) => {
        console.warn('Could not read the app lock setting', error);
        if (active) setEnabled(false);
      });
    };
    reload();
    const unsubscribe = onDataChanged(reload);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!enabledRef.current) return;
      if (state === 'active') {
        const since = backgroundSince.current;
        backgroundSince.current = null;
        if (since != null && Date.now() - since >= LOCK_AFTER_MS) {
          setLocked(true);
          unlock();
        }
        setCovered(false);
        return;
      }
      // Leaving the app ("inactive" is the iOS app switcher): cover it straight away.
      setCovered(true);
      // A PIN prompt can send the app to the background; that isn't time away.
      if (state === 'background' && backgroundSince.current == null && !prompting.current) {
        backgroundSince.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [unlock]);

  useEffect(() => {
    if (enabled !== null) SplashScreen.hideAsync();
  }, [enabled]);

  if (!enabled || (!locked && !covered)) return null;

  const screen = (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <Image source={require('../../assets/images/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
      {locked ? (
        <>
          <ThemedText type="subtitle" accessibilityRole="header">
            DueRadar is locked
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.text}>
            Unlock with your fingerprint, face or phone PIN.
          </ThemedText>
          <Button title="Unlock" onPress={unlock} />
        </>
      ) : null}
    </SafeAreaView>
  );

  // On iOS a Modal can't show over another one (a new item, a photo picker), so
  // use an overlay window above everything. On Android a Modal is its own window.
  return Platform.OS === 'ios' ? (
    <FullWindowOverlay>{screen}</FullWindowOverlay>
  ) : (
    <Modal visible animationType="none" onRequestClose={() => BackHandler.exitApp()}>
      {screen}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  text: {
    textAlign: 'center',
  },
});
