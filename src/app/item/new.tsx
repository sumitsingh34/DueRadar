import { useSQLiteContext } from 'expo-sqlite';

import { ItemForm } from '@/components/item-form';
import { createItem } from '@/db/items';
import { goBack } from '@/utils/navigation';

export default function NewItemScreen() {
  const db = useSQLiteContext();
  return (
    <ItemForm
      submitLabel="Add item"
      onSubmit={async (input) => {
        await createItem(db, input);
        goBack();
      }}
    />
  );
}
