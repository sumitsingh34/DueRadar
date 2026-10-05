import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { choosePhoto, takePhoto, type PickedPhoto } from '@/attachments/pick';
import { attachmentsSupported } from '@/attachments/storage';
import { Button } from '@/components/form-controls';
import { PhotoViewer } from '@/components/photo-viewer';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { showMessage } from '@/utils/confirm';

/**
 * A receipt photo: take or choose one, then view, replace or remove it.
 * Hidden on the web, which has no file storage.
 */
export function ReceiptField({
  value,
  onChange,
}: {
  value: PickedPhoto | null;
  onChange: (photo: PickedPhoto | null) => void;
}) {
  const theme = useTheme();
  const [viewing, setViewing] = useState(false);

  if (!attachmentsSupported) return null;

  const pick = async (source: () => Promise<PickedPhoto | null>) => {
    try {
      const photo = await source();
      if (photo) onChange(photo);
    } catch (error) {
      showMessage('Couldn’t add the photo', error instanceof Error ? error.message : String(error));
    }
  };

  if (!value) {
    return (
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="Take photo" variant="secondary" onPress={() => pick(takePhoto)} />
        </View>
        <View style={styles.button}>
          <Button title="Choose photo" variant="secondary" onPress={() => pick(choosePhoto)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.attached}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="View receipt"
        onPress={() => setViewing(true)}
        style={({ pressed }) => pressed && styles.pressed}>
        <Image
          source={{ uri: value.uri }}
          style={[styles.thumbnail, { borderColor: theme.border }]}
          resizeMode="cover"
        />
      </Pressable>
      <View style={styles.attachedActions}>
        <ThemedText type="small" themeColor="textSecondary">
          Tap the photo to view it.
        </ThemedText>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title="Replace" variant="secondary" onPress={() => pick(choosePhoto)} />
          </View>
          <View style={styles.button}>
            <Button title="Remove" variant="danger" onPress={() => onChange(null)} />
          </View>
        </View>
      </View>

      <PhotoViewer
        uris={[value.uri]}
        index={viewing ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setViewing(false)}
        label="Receipt"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  attached: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  attachedActions: {
    flex: 1,
    gap: Spacing.two,
  },
  thumbnail: {
    width: 72,
    height: 96,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.6,
  },
});
