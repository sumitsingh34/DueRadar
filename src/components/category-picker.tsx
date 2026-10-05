import { StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { AVAILABLE_CATEGORIES, CATEGORY_GROUPS, type CategoryId } from '@/domain/categories';

/** The categories, in groups: bills and renewals, your things, life admin. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
}) {
  return (
    <View style={styles.groups}>
      {CATEGORY_GROUPS.map((group) => {
        const categories = AVAILABLE_CATEGORIES.filter((c) => c.group === group.id);
        if (categories.length === 0) return null;
        return (
          <View key={group.id} style={styles.group}>
            <ThemedText type="small" themeColor="textSecondary">
              {group.label}
            </ThemedText>
            <ChipGroup
              accessibilityLabel={group.label}
              options={categories.map((c) => ({ value: c.id, label: c.label, color: c.color }))}
              value={value}
              onChange={onChange}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
});
