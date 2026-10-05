import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet } from 'react-native';

import { AssetForm } from '@/components/asset-form';
import { ThemedView } from '@/components/themed-view';
import { createAsset } from '@/db/assets';
import { ASSET_KINDS } from '@/domain/assets';
import { todayISO } from '@/domain/dates';
import { defaultDistanceUnit } from '@/domain/usage';
import { useSettings } from '@/hooks/use-settings';
import { goBack } from '@/utils/navigation';

export default function NewAssetScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const db = useSQLiteContext();
  const settings = useSettings();

  if (!settings) return <ThemedView style={styles.fill} />;

  const presetKind = kind === 'vehicle' || kind === 'home' ? kind : undefined;
  const noun = presetKind ? ASSET_KINDS[presetKind].label.toLowerCase() : 'vehicle or home';

  return (
    <>
      <Stack.Screen options={{ title: `New ${noun}` }} />
      <AssetForm
        kind={presetKind}
        defaultUnit={defaultDistanceUnit(settings.currency)}
        submitLabel={presetKind ? `Add ${noun}` : 'Add'}
        onSubmit={async (input, reading) => {
          await createAsset(db, input, reading != null ? { reading, date: todayISO() } : null);
          goBack();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
