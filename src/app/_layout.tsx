import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ReminderSync } from '@/components/reminder-sync';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';
import { configureNotifications } from '@/notifications/reminders';

SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Children render only after migrations finish. */}
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <HideSplashWhenReady />
        <ReminderSync />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/new" options={{ presentation: 'modal', title: 'New item' }} />
          <Stack.Screen name="item/[id]" options={{ title: 'Edit item' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}

function HideSplashWhenReady() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return null;
}
