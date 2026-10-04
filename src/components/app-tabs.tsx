import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, useColorScheme } from 'react-native';

import { BrandBlue, Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  // The selected tab is highlighted in the app's blue: a blue pill behind a
  // white icon on Android, a blue icon on iOS, and a blue label on both.
  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.tint}
      indicatorColor={BrandBlue}
      iconColor={{
        default: colors.textSecondary,
        selected: Platform.OS === 'android' ? '#ffffff' : colors.tint,
      }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.tint, fontWeight: '600' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="items">
        <NativeTabs.Trigger.Label>All items</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
