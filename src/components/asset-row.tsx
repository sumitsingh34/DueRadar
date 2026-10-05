import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ASSET_KINDS } from '@/domain/assets';
import type { Asset } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/** A vehicle or home in a list. Tapping it opens its page. */
export function AssetRow({
  asset,
  subtitle,
  warn = false,
}: {
  asset: Asset;
  subtitle: string;
  /** Shows the subtitle as a warning, e.g. an old odometer reading. */
  warn?: boolean;
}) {
  const theme = useTheme();
  const color = ASSET_KINDS[asset.kind].color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}, ${subtitle}`}
      onPress={() => router.push({ pathname: '/asset/[id]', params: { id: String(asset.id) } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: color },
        pressed && styles.pressed,
      ]}>
      <Icon name={asset.kind} color={color} size={20} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{asset.name}</ThemedText>
        <ThemedText type="small" numberOfLines={1} themeColor={warn ? 'warning' : 'textSecondary'}>
          {subtitle}
        </ThemedText>
      </View>
      <Icon name="chevron" color={theme.textSecondary} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
