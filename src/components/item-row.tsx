import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteItem } from '@/db/items';
import { getCategory } from '@/domain/categories';
import { formatShortDate, todayISO } from '@/domain/dates';
import { costSuffix } from '@/domain/frequency';
import { formatMoney } from '@/domain/money';
import { dueLabel, type DueItem } from '@/domain/summary';
import type { Item } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { confirmAsync } from '@/utils/confirm';

const STATUS_LABELS = { active: null, paused: 'Paused', cancelled: 'Cancelled' } as const;

/**
 * One item in a list. Tapping it opens the item. With `showActions`, it also
 * has edit and delete buttons; otherwise an arrow hints that it opens.
 */
export function ItemRow({
  item,
  due,
  showActions = false,
}: {
  item: Item;
  due: DueItem | null;
  showActions?: boolean;
}) {
  const theme = useTheme();
  const db = useSQLiteContext();

  const statusLabel = STATUS_LABELS[item.status];
  const subtitle =
    statusLabel ??
    (due ? `${dueLabel(due)} · ${formatShortDate(due.dueDate, todayISO())}` : 'No date set');

  let price: string | null = null;
  if (item.amountCents != null) {
    price = formatMoney(item.amountCents, item.currency);
    if (item.scheduleType === 'recurring' && item.intervalUnit && item.intervalCount) {
      price += costSuffix({ unit: item.intervalUnit, count: item.intervalCount });
    }
  }

  const categoryColor = getCategory(item.category).color;
  const open = () => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } });

  const remove = async () => {
    const confirmed = await confirmAsync(
      `Delete ${item.name}?`,
      'Its price history and any receipt will be deleted too. This can’t be undone.',
      'Delete',
    );
    if (confirmed) await deleteItem(db, item.id);
  };

  return (
    <View
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: categoryColor }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[item.name, subtitle, price].filter(Boolean).join(', ')}
        onPress={open}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={[styles.dot, { backgroundColor: categoryColor }]} />
        <View style={styles.text}>
          {showActions ? (
            // The edit and delete buttons take width, so the price gets its own line.
            <>
              <ThemedText numberOfLines={1}>{item.name}</ThemedText>
              {price ? (
                <ThemedText type="smallBold" numberOfLines={1}>
                  {price}
                </ThemedText>
              ) : null}
            </>
          ) : (
            <View style={styles.titleLine}>
              <ThemedText numberOfLines={1} style={styles.name}>
                {item.name}
              </ThemedText>
              {price ? (
                <ThemedText type="smallBold" numberOfLines={1} style={styles.price}>
                  {price}
                </ThemedText>
              ) : null}
            </View>
          )}
          <ThemedText
            type="small"
            numberOfLines={1}
            themeColor={!statusLabel && due && due.daysUntil < 0 ? 'danger' : 'textSecondary'}>
            {subtitle}
          </ThemedText>
        </View>
        {showActions ? null : <Icon name="chevron" color={theme.textSecondary} size={16} />}
      </Pressable>
      {showActions ? (
        <View style={styles.actions}>
          <IconButton icon="edit" label={`Edit ${item.name}`} color={theme.text} onPress={open} />
          <IconButton
            icon="delete"
            label={`Delete ${item.name}`}
            color={theme.danger}
            onPress={() => {
              remove().catch((error) => console.error('Failed to delete item', error));
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function IconButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    // Outlined in the category's color, matching the dot.
    borderWidth: 1.5,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  price: {
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    paddingRight: Spacing.one,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.6,
  },
});
