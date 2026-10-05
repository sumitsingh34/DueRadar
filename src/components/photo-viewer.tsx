import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Shows photos full screen, one at a time, with ‹ › to move between them when
 * there are several. Closes with ✕ or the back button.
 */
export function PhotoViewer({
  uris,
  index,
  onIndexChange,
  onClose,
  label,
}: {
  uris: readonly string[];
  /** The photo shown, or null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  label: string;
}) {
  const visible = index != null && index < uris.length;
  const current = visible ? index : 0;
  const many = uris.length > 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.viewer}>
        {visible ? (
          <Image
            source={{ uri: uris[current] }}
            style={styles.full}
            resizeMode="contain"
            accessibilityLabel={many ? `${label} ${current + 1} of ${uris.length}` : label}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Icon name="clear" color="#ffffff" size={32} />
        </Pressable>
        {many ? (
          <View style={styles.nav}>
            <NavButton label="Previous photo" text="‹" disabled={current === 0} onPress={() => onIndexChange(current - 1)} />
            <ThemedText style={styles.count}>
              {current + 1} / {uris.length}
            </ThemedText>
            <NavButton
              label="Next photo"
              text="›"
              disabled={current === uris.length - 1}
              onPress={() => onIndexChange(current + 1)}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function NavButton({
  label,
  text,
  disabled,
  onPress,
}: {
  label: string;
  text: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.navButton, (pressed || disabled) && styles.pressed]}>
      <ThemedText style={styles.navText}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  full: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.three,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.three,
  },
  navButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 40,
  },
  count: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.4,
  },
});
