import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { Button, ChipGroup, FormField, MultiChipGroup, SwitchRow } from '@/components/form-controls';
import { Section, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { exportBackup, restoreBackup } from '@/db/backup';
import { emitDataChanged } from '@/db/events';
import { setCurrencyForAllItems } from '@/db/items';
import { updateSettings } from '@/db/settings';
import { BackupError, itemsToCsv, parseBackup } from '@/domain/backup';
import { todayISO } from '@/domain/dates';
import { planReminders } from '@/domain/reminders';
import {
  CURRENCY_OPTIONS,
  formatHour,
  REMINDER_DAY_OPTIONS,
  REMINDER_HOUR_OPTIONS,
  type AppSettings,
} from '@/domain/settings';
import { useAssets } from '@/hooks/use-assets';
import { useItems } from '@/hooks/use-items';
import { useSettings } from '@/hooks/use-settings';
import {
  getReminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from '@/notifications/reminders';
import { confirmAsync, showMessage } from '@/utils/confirm';
import { pickTextFile, shareTextFile } from '@/utils/files';

const REPO_URL = 'https://github.com/sumitsingh34/DueRadar';

const dayLabel = (days: number) =>
  days === 0 ? 'On the day' : days === 1 ? '1 day before' : `${days} days before`;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const items = useItems();
  const assetData = useAssets();
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getReminderPermission()
        .then((value) => {
          if (active) setPermission(value);
        })
        .catch((error) => console.warn('Could not read notification permission', error));
      return () => {
        active = false;
      };
    }, []),
  );

  if (!settings || !items || !assetData) return <ThemedView style={styles.fill} />;

  const save = (patch: Partial<AppSettings>) => {
    updateSettings(db, patch).catch((error) => showMessage('Couldn’t save the setting', String(error)));
  };

  /** Runs one action at a time and turns failures into a message. */
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage(error instanceof BackupError ? 'Can’t restore this file' : 'Something went wrong', message);
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = (value: string) => {
    const day = Number(value);
    const days = settings.reminderDays.includes(day)
      ? settings.reminderDays.filter((d) => d !== day)
      : [...settings.reminderDays, day];
    save({ reminderDays: days.sort((a, b) => b - a) });
  };

  const allowNotifications = () =>
    run(async () => {
      const result = await requestReminderPermission();
      setPermission(result);
      if (result === 'granted') emitDataChanged();
    });

  const exportJson = () =>
    run(async () => {
      const backup = await exportBackup(db);
      await shareTextFile(
        `dueradar-backup-${todayISO()}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
    });

  const exportCsv = () =>
    run(() =>
      shareTextFile(`dueradar-${todayISO()}.csv`, itemsToCsv(items, todayISO(), assetData.assets), 'text/csv'),
    );

  const restore = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text == null) return;
      const backup = parseBackup(text);
      if (items.length > 0) {
        const confirmed = await confirmAsync(
          'Replace your data?',
          `Your ${plural(items.length, 'item')} will be replaced by the ${plural(backup.items.length, 'item')} in this backup. This can’t be undone.`,
          'Replace',
        );
        if (!confirmed) return;
      }
      await restoreBackup(db, backup);
      showMessage('Backup restored', `${plural(backup.items.length, 'item')} restored.`);
    });

  const otherCurrencyCount = items.filter((item) => item.currency !== settings.currency).length;
  const switchCurrency = () =>
    run(async () => {
      const confirmed = await confirmAsync(
        `Switch ${plural(otherCurrencyCount, 'item')} to ${settings.currency}?`,
        'Amounts keep their numbers. Only the currency changes, nothing is converted.',
        'Switch',
      );
      if (confirmed) await setCurrencyForAllItems(db, settings.currency);
    });

  const nextReminder =
    permission === 'granted' ? planReminders(items, settings, new Date(), assetData.usage)[0] : undefined;

  return (
    <TabScreen title="Settings" showAdd={false}>
      <Section title="Reminders">
        <Card>
          <SwitchRow
            label="Remind me before due dates"
            description="Notifications on this phone. Nothing is sent anywhere else."
            value={settings.remindersEnabled}
            onValueChange={(remindersEnabled) => save({ remindersEnabled })}
          />
          {permission === 'unsupported' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Reminders come from the Android and iPhone app, not the web version.
            </ThemedText>
          ) : null}
          {settings.remindersEnabled ? (
            <>
              <FormField label="How early">
                <MultiChipGroup
                  accessibilityLabel="How early"
                  options={REMINDER_DAY_OPTIONS.map((d) => ({ value: String(d), label: dayLabel(d) }))}
                  values={settings.reminderDays.map(String)}
                  onToggle={toggleDay}
                />
              </FormField>
              <FormField label="At">
                <ChipGroup
                  accessibilityLabel="Time of day"
                  options={REMINDER_HOUR_OPTIONS.map((h) => ({ value: String(h), label: formatHour(h) }))}
                  value={String(settings.reminderHour)}
                  onChange={(value) => save({ reminderHour: Number(value) })}
                />
              </FormField>
              <ThemedText type="small" themeColor="textSecondary">
                Reminders longer than the billing period are skipped, so a monthly bill never gets
                a 30-day reminder.
              </ThemedText>
              {permission === 'undetermined' ? (
                <Button title="Allow notifications" onPress={allowNotifications} disabled={busy} />
              ) : null}
              {permission === 'denied' ? (
                <>
                  <ThemedText type="small" themeColor="danger">
                    Notifications are turned off for DueRadar in your phone’s settings.
                  </ThemedText>
                  <Button
                    title="Open phone settings"
                    variant="secondary"
                    onPress={() => Linking.openSettings()}
                  />
                </>
              ) : null}
              {permission === 'granted' ? (
                <ThemedText type="small">
                  {nextReminder
                    ? `Next reminder: “${nextReminder.title}”, ${nextReminder.fireAt.toLocaleString(
                        undefined,
                        { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
                      )}`
                    : 'No reminders coming up yet.'}
                </ThemedText>
              ) : null}
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Currency">
        <Card>
          <ChipGroup
            accessibilityLabel="Currency"
            options={CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))}
            value={settings.currency}
            onChange={(currency) => save({ currency })}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Used for new items.
          </ThemedText>
          {otherCurrencyCount > 0 ? (
            <Button
              title={`Switch ${plural(otherCurrencyCount, 'existing item')} to ${settings.currency}`}
              variant="secondary"
              onPress={switchCurrency}
              disabled={busy}
            />
          ) : null}
        </Card>
      </Section>

      <Section title="Backup">
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Everything is stored only on this device. Export a backup to keep a copy, for example
            in Google Drive or email, or to move to a new phone.
          </ThemedText>
          <Button title="Export backup (.json)" onPress={exportJson} disabled={busy} />
          <Button
            title="Export spreadsheet (.csv)"
            variant="secondary"
            onPress={exportCsv}
            disabled={busy}
          />
          <Button title="Restore from backup" variant="secondary" onPress={restore} disabled={busy} />
        </Card>
      </Section>

      <Section title="About">
        <Card>
          <ThemedText>DueRadar {Constants.expoConfig?.version}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Free and open source. No accounts, no ads, no tracking.
          </ThemedText>
          <Button
            title="Source code on GitHub"
            variant="secondary"
            onPress={() => Linking.openURL(REPO_URL)}
          />
        </Card>
      </Section>
    </TabScreen>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
