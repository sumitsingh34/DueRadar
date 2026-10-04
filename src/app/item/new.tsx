import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet } from 'react-native';

import { ItemForm } from '@/components/item-form';
import { ThemedView } from '@/components/themed-view';
import { emitDataChanged } from '@/db/events';
import { createItem } from '@/db/items';
import { useSettings } from '@/hooks/use-settings';
import { getReminderPermission, requestReminderPermission } from '@/notifications/reminders';
import { goBack } from '@/utils/navigation';

export default function NewItemScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();

  if (!settings) return <ThemedView style={styles.fill} />;

  return (
    <ItemForm
      defaultCurrency={settings.currency}
      submitLabel="Add item"
      onSubmit={async (input) => {
        await createItem(db, input);
        // Ask for notification permission when it first matters: right after saving something.
        if (settings.remindersEnabled && (await getReminderPermission()) === 'undetermined') {
          if ((await requestReminderPermission()) === 'granted') emitDataChanged();
        }
        goBack();
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
