import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable tab page with a large title and, optionally, an "Add" button. */
export function TabScreen({
  title,
  brand = false,
  showAdd = true,
  children,
}: {
  title: string;
  /**
   * Shows the app's icon and name in place of the title, on phones. The web
   * keeps the title, since its top bar already shows the name.
   */
  brand?: boolean;
  showAdd?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Native tabs handle the tab bar on both platforms and the status bar on iOS
  // (automatic scroll view insets). Android needs the status bar inset, and the
  // web needs room for its floating tab bar.
  const paddingTop = Platform.OS === 'android' ? insets.top : TopTabInset;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            {brand && Platform.OS !== 'web' ? (
              <View style={styles.brand}>
                <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
                <ThemedText type="subtitle" accessibilityRole="header">
                  DueRadar
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="subtitle" accessibilityRole="header">
                {title}
              </ThemedText>
            )}
            {showAdd ? <AddButton /> : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function AddButton() {
  const theme = useTheme();
  // A plain Pressable: `Link asChild` drops a child's function style on native.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add item"
      onPress={() => router.push('/item/new')}
      style={({ pressed }) => [
        styles.addButton,
        { backgroundColor: theme.tint },
        pressed && styles.pressed,
      ]}>
      <Icon name="add" color={theme.onTint} size={18} />
      <ThemedText type="smallBold" style={{ color: theme.onTint }}>
        Add
      </ThemedText>
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        {title}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Rounded like the icon on the home screen.
  logo: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    paddingLeft: Spacing.two + Spacing.one,
    paddingRight: Spacing.three,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.6,
  },
  section: {
    gap: Spacing.two,
  },
  sectionBody: {
    gap: Spacing.two,
  },
});
