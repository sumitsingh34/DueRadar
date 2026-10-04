import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable tab page with a large title and, optionally, an "Add" button. */
export function TabScreen({
  title,
  showAdd = true,
  children,
}: {
  title: string;
  showAdd?: boolean;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SafeAreaView edges={['top']} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle" accessibilityRole="header">
              {title}
            </ThemedText>
            {showAdd ? <AddButton /> : null}
          </View>
          {children}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function AddButton() {
  const theme = useTheme();
  return (
    <Link href="/item/new" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add item"
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: theme.tint },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={{ color: theme.onTint }}>
          + Add
        </ThemedText>
      </Pressable>
    </Link>
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
    paddingTop: TopTabInset,
    paddingBottom: BottomTabInset + Spacing.four,
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
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
