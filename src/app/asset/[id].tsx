import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AssetForm } from '@/components/asset-form';
import { Button, FormField, TextField } from '@/components/form-controls';
import { ItemRow } from '@/components/item-row';
import { Section } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { addReading, deleteAsset, updateAsset } from '@/db/assets';
import { ASSET_KINDS } from '@/domain/assets';
import { formatDate, todayISO } from '@/domain/dates';
import { toDueItem } from '@/domain/summary';
import type { Asset } from '@/domain/types';
import { formatDistance, parseDistanceInput, type VehicleUsage } from '@/domain/usage';
import { useAssets } from '@/hooks/use-assets';
import { useItems } from '@/hooks/use-items';
import { confirmAsync, showMessage } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

/** A vehicle or home: its odometer, its items, and its details to edit. */
export default function AssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const data = useAssets();
  const items = useItems();

  if (!data || !items) return <ThemedView style={styles.fill} />;

  const asset = data.assets.find((a) => a.id === Number(id));
  if (!asset) {
    return (
      <ThemedView style={[styles.fill, styles.centered]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This no longer exists.</ThemedText>
        <Button title="Go back" variant="secondary" onPress={goBack} />
      </ThemedView>
    );
  }

  const noun = ASSET_KINDS[asset.kind].label.toLowerCase();
  const today = todayISO();
  const rows = items
    .filter((item) => item.assetId === asset.id)
    .map((item) => ({ item, due: toDueItem(item, today, data.usage) }))
    .sort(
      (a, b) =>
        Number(a.item.status !== 'active') - Number(b.item.status !== 'active') ||
        (a.due?.daysUntil ?? Infinity) - (b.due?.daysUntil ?? Infinity),
    );

  const remove = async () => {
    const confirmed = await confirmAsync(
      `Delete ${asset.name}?`,
      rows.length > 0
        ? `Its ${rows.length === 1 ? 'item stays' : `${rows.length} items stay`}, without a ${noun}.${
            asset.kind === 'vehicle' ? ' Its odometer readings are deleted.' : ''
          }`
        : 'This can’t be undone.',
      'Delete',
    );
    if (!confirmed) return;
    await deleteAsset(db, asset.id);
    goBack();
  };

  const header = (
    <>
      {asset.kind === 'vehicle' ? <OdometerCard asset={asset} usage={data.usage.get(asset.id)} /> : null}
      <Section title={`Items · ${rows.length}`}>
        {rows.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            {asset.kind === 'vehicle'
              ? 'Add oil changes, servicing, registration or insurance for this vehicle.'
              : 'Add maintenance like AC service or pest control, or home insurance.'}
          </ThemedText>
        ) : null}
        {rows.map(({ item, due }) => (
          <ItemRow key={item.id} item={item} due={due} />
        ))}
        <Button
          title={`Add an item for ${asset.name}`}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/item/new',
              params: {
                assetId: String(asset.id),
                category: asset.kind === 'vehicle' ? 'vehicle' : 'maintenance',
              },
            })
          }
        />
      </Section>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        Details
      </ThemedText>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: asset.name }} />
      <AssetForm
        key={asset.updatedAt}
        initial={asset}
        defaultUnit={asset.usageUnit ?? 'km'}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateAsset(db, asset.id, input);
          goBack();
        }}
        header={header}
        footer={<Button title={`Delete ${noun}`} variant="danger" onPress={remove} />}
      />
    </>
  );
}

/** The latest odometer reading, the average distance, and a way to add a reading. */
function OdometerCard({ asset, usage }: { asset: Asset; usage: VehicleUsage | undefined }) {
  const db = useSQLiteContext();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const unit = asset.usageUnit ?? 'km';

  const save = async () => {
    const reading = parseDistanceInput(value);
    if (reading == null) {
      setError('Enter a whole number, like 45000.');
      return;
    }
    if (usage && reading < usage.reading) {
      const confirmed = await confirmAsync(
        'Lower than the last reading',
        `The last reading was ${formatDistance(usage.reading, usage.unit)}. Save ${formatDistance(reading, unit)} anyway?`,
        'Save',
      );
      if (!confirmed) return;
    }
    try {
      await addReading(db, asset.id, reading, todayISO());
      setEditing(false);
      setValue('');
      setError(null);
    } catch (e) {
      showMessage('Couldn’t save the reading', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardText}>
        <ThemedText type="small" themeColor="textSecondary">
          Odometer
        </ThemedText>
        {usage ? (
          <>
            <ThemedText type="subtitle">{formatDistance(usage.reading, usage.unit)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {usage.readingDate === todayISO() ? 'Today' : formatDate(usage.readingDate)}
              {usage.perDay
                ? ` · about ${formatDistance(Math.round(usage.perDay * 30.44), usage.unit)} a month`
                : ''}
            </ThemedText>
          </>
        ) : (
          <ThemedText themeColor="textSecondary">
            No reading yet. Add one to track services due by distance.
          </ThemedText>
        )}
      </View>
      {editing ? (
        <FormField label={`Reading today (${unit})`} error={error}>
          <TextField
            value={value}
            onChangeText={setValue}
            placeholder={usage ? String(usage.reading) : '45000'}
            keyboardType="number-pad"
            accessibilityLabel={`Odometer reading today, in ${unit}`}
            autoFocus
          />
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button title="Save reading" onPress={save} />
            </View>
            <View style={styles.button}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setEditing(false);
                  setError(null);
                }}
              />
            </View>
          </View>
        </FormField>
      ) : (
        <Button title="Update odometer" variant="secondary" onPress={() => setEditing(true)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardText: {
    gap: Spacing.half,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
});
