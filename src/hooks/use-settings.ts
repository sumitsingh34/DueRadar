import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { onDataChanged } from '@/db/events';
import { getSettings } from '@/db/settings';
import type { AppSettings } from '@/domain/settings';

/** App settings, reloaded on focus and after any change while focused. Null while loading. */
export function useSettings(): AppSettings | null {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        getSettings(db)
          .then((value) => {
            if (active) setSettings(value);
          })
          .catch((error) => console.error('Failed to load settings', error));
      };
      load();
      const unsubscribe = onDataChanged(load);
      return () => {
        active = false;
        unsubscribe();
      };
    }, [db]),
  );

  return settings;
}
