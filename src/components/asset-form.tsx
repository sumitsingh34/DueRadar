import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, ChipGroup, FormField, TextField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ASSET_KINDS } from '@/domain/assets';
import type { AssetInput, AssetKind, DistanceUnit } from '@/domain/types';
import { DISTANCE_UNITS, parseDistanceInput } from '@/domain/usage';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { showMessage } from '@/utils/confirm';

const KIND_OPTIONS = (Object.keys(ASSET_KINDS) as AssetKind[]).map((kind) => ({
  value: kind,
  label: ASSET_KINDS[kind].label,
  color: ASSET_KINDS[kind].color,
}));

const UNIT_OPTIONS = DISTANCE_UNITS.map((unit) => ({
  value: unit,
  label: unit === 'km' ? 'Kilometers' : 'Miles',
}));

interface AssetFormProps {
  initial?: AssetInput;
  /** The kind for a new one. Without it, the form asks. */
  kind?: AssetKind;
  /** Odometer unit for a new vehicle. */
  defaultUnit: DistanceUnit;
  submitLabel: string;
  /**
   * Saves it. `reading` is the current odometer reading of a new vehicle, if
   * given. The screen closes once it's done.
   */
  onSubmit: (input: AssetInput, reading: number | null) => Promise<void>;
  /**
   * Shows a delete button. Deletes it after asking, and resolves to whether
   * it did; the screen then closes.
   */
  onDelete?: () => Promise<boolean>;
  /** Extra content above the fields, e.g. the odometer and items. */
  header?: ReactNode;
}

type Errors = Partial<Record<'name' | 'reading', string>>;

/** Adds or edits a vehicle or home. */
export function AssetForm({
  initial,
  kind: presetKind,
  defaultUnit,
  submitLabel,
  onSubmit,
  onDelete,
  header,
}: AssetFormProps) {
  const theme = useTheme();
  const [kind, setKind] = useState<AssetKind>(initial?.kind ?? presetKind ?? 'vehicle');
  const [name, setName] = useState(initial?.name ?? '');
  const [plate, setPlate] = useState(typeof initial?.details.plate === 'string' ? initial.details.plate : '');
  const [unit, setUnit] = useState<DistanceUnit>(initial?.usageUnit ?? defaultUnit);
  const [reading, setReading] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const leave = useUnsavedChanges({
    values: { kind, name, plate, unit, reading, notes },
    saving,
    save: () => submit(),
  });

  const isVehicle = kind === 'vehicle';
  const kindInfo = ASSET_KINDS[kind];

  const submit = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter a name.';
    let odometer: number | null = null;
    if (isVehicle && !initial && reading.trim()) {
      odometer = parseDistanceInput(reading);
      if (odometer == null) next.reading = 'Enter a whole number, like 45000.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const details = { ...initial?.details };
    if (isVehicle && plate.trim()) details.plate = plate.trim();
    else delete details.plate;

    setSaving(true);
    try {
      await onSubmit(
        { name, kind, usageUnit: isVehicle ? unit : null, details, notes },
        odometer,
      );
    } catch (error) {
      showMessage('Couldn’t save', error instanceof Error ? error.message : String(error));
      return;
    } finally {
      setSaving(false);
    }
    leave();
  };

  const remove = async () => {
    try {
      if (await onDelete?.()) leave();
    } catch (error) {
      showMessage('Couldn’t delete', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.form}>
        {header}
        {!initial && !presetKind ? (
          <FormField label="Kind">
            <ChipGroup accessibilityLabel="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
          </FormField>
        ) : null}

        <FormField label="Name" error={errors.name}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={kindInfo.placeholder}
            accessibilityLabel="Name"
            autoFocus={!initial}
          />
        </FormField>

        {isVehicle ? (
          <>
            <FormField label="Plate number (optional)">
              <TextField
                value={plate}
                onChangeText={setPlate}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                accessibilityLabel="Plate number"
              />
            </FormField>
            <FormField label="Odometer unit">
              <ChipGroup
                accessibilityLabel="Odometer unit"
                options={UNIT_OPTIONS}
                value={unit}
                onChange={setUnit}
              />
              {initial?.usageUnit && unit !== initial.usageUnit ? (
                <ThemedText type="small" themeColor="warning">
                  Readings and distances already entered keep their numbers; they aren’t converted.
                  Tasks with distances in {initial.usageUnit} stop tracking them until you edit them.
                </ThemedText>
              ) : null}
            </FormField>
            {!initial ? (
              <FormField label={`Odometer now (${unit}, optional)`} error={errors.reading}>
                <TextField
                  value={reading}
                  onChangeText={setReading}
                  placeholder="45000"
                  keyboardType="number-pad"
                  accessibilityLabel={`Odometer reading now, in ${unit}`}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Lets DueRadar track services due by distance, like an oil change every{' '}
                  {unit === 'mi' ? '5,000 miles' : '10,000 km'}.
                </ThemedText>
              </FormField>
            ) : null}
          </>
        ) : null}

        <FormField label="Notes (optional)">
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder={isVehicle ? 'Model, VIN, tire size…' : 'Address, model numbers…'}
            accessibilityLabel="Notes"
            multiline
            style={styles.notes}
          />
        </FormField>

        <Button title={saving ? 'Saving…' : submitLabel} onPress={submit} disabled={saving} />
        {onDelete ? (
          <Button
            title={`Delete ${kindInfo.label.toLowerCase()}`}
            variant="danger"
            onPress={remove}
            disabled={saving}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
