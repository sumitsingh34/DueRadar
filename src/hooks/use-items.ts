import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { onDataChanged } from '@/db/events';
import { listItems } from '@/db/items';
import type { Item } from '@/domain/types';

/** All items, reloaded on focus and after any change while focused. Null while loading. */
export function useItems(): Item[] | null {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Item[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        listItems(db)
          .then((rows) => {
            if (active) setItems(rows);
          })
          .catch((error) => console.error('Failed to load items', error));
      };
      load();
      const unsubscribe = onDataChanged(load);
      return () => {
        active = false;
        unsubscribe();
      };
    }, [db]),
  );

  return items;
}
