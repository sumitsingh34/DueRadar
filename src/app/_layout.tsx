import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AppLock } from '@/components/app-lock';
import { ReminderSync } from '@/components/reminder-sync';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { configureNotifications } from '@/notifications/reminders';
import { clearTemporaryFiles } from '@/utils/files';

SplashScreen.preventAutoHideAsync();
configureNotifications();
clearTemporaryFiles();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Children render only after migrations finish. */}
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        {/* Hides the splash screen once it knows whether to show the lock screen. */}
        <AppLock />
        <ReminderSync />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/new" options={{ presentation: 'modal', title: 'New item' }} />
          <Stack.Screen name="item/[id]" options={{ title: 'Edit item' }} />
          <Stack.Screen name="item/done/[id]" options={{ presentation: 'modal', title: 'Mark as done' }} />
          <Stack.Screen name="asset/new" options={{ presentation: 'modal', title: 'New vehicle or home' }} />
          <Stack.Screen name="asset/[id]" options={{ title: 'Vehicle or home' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
