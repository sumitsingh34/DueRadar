import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listItems } from '@/db/items';
import type { Item } from '@/domain/types';

/** All items, reloaded whenever the screen comes into focus. Null while loading. */
export function useItems(): Item[] | null {
  const db = useSQLiteContext();
  const [items, setItems] = useState<Item[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listItems(db)
        .then((rows) => {
          if (active) setItems(rows);
        })
        .catch((error) => console.error('Failed to load items', error));
      return () => {
        active = false;
      };
    }, [db]),
  );

  return items;
}
