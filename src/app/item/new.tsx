import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet } from 'react-native';

import { ItemForm } from '@/components/item-form';
import { ThemedView } from '@/components/themed-view';
import { saveDocumentPhotos, setReceipt } from '@/db/attachments';
import { emitDataChanged } from '@/db/events';
import { createItem } from '@/db/items';
import { CATEGORIES, type CategoryId } from '@/domain/categories';
import { useSettings } from '@/hooks/use-settings';
import { getReminderPermission, requestReminderPermission } from '@/notifications/reminders';
import { showMessage } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

export default function NewItemScreen() {
  // Set when adding from a vehicle's or home's page.
  const params = useLocalSearchParams<{ assetId?: string; category?: string }>();
  const db = useSQLiteContext();
  const settings = useSettings();

  if (!settings) return <ThemedView style={styles.fill} />;

  const assetId = Number(params.assetId);
  const category = CATEGORIES.some((c) => c.id === params.category)
    ? (params.category as CategoryId)
    : undefined;

  return (
    <ItemForm
      defaultCurrency={settings.currency}
      defaultCategory={category}
      defaultAssetId={Number.isInteger(assetId) && assetId > 0 ? assetId : undefined}
      submitLabel="Add item"
      onSubmit={async (input, files) => {
        const id = await createItem(db, input);
        if (files.receipt) {
          try {
            await setReceipt(db, id, files.receipt);
          } catch (error) {
            showMessage('Saved, but the receipt wasn’t', error instanceof Error ? error.message : String(error));
          }
        }
        if (files.photos.length > 0) {
          try {
            await saveDocumentPhotos(db, id, files.photos);
          } catch (error) {
            showMessage('Saved, but the photos weren’t', error instanceof Error ? error.message : String(error));
          }
        }
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
