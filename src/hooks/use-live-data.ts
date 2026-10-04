import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { onDataChanged } from '@/db/events';

/**
 * Loads data when the screen comes into focus and again after any change
 * while it stays focused. Null while loading. `load` must be a stable
 * function, such as a module-level query.
 */
export function useLiveData<T>(load: (db: SQLiteDatabase) => Promise<T>): T | null {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const reload = () => {
        load(db)
          .then((value) => {
            if (active) setData(value);
          })
          .catch((error) => console.error('Failed to load data', error));
      };
      reload();
      const unsubscribe = onDataChanged(reload);
      return () => {
        active = false;
        unsubscribe();
      };
    }, [db, load]),
  );

  return data;
}
