import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { choosePhoto, takePhoto, type PickedPhoto } from '@/attachments/pick';
import { attachmentsSupported } from '@/attachments/storage';
import { Button } from '@/components/form-controls';
import { Icon } from '@/components/icon';
import { PhotoViewer } from '@/components/photo-viewer';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DocumentPhoto } from '@/db/attachments';
import { useTheme } from '@/hooks/use-theme';
import { showMessage } from '@/utils/confirm';

/** Enough for the pages of most documents, e.g. the front and back of a card. */
export const MAX_DOCUMENT_PHOTOS = 6;

let nextKey = 0;

/**
 * Photos of a document, such as both sides of an ID card. They're stored
 * encrypted on the phone. Hidden on the web, which has no file storage.
 */
export function DocumentPhotosField({
  value,
  onChange,
  appLockOn,
}: {
  value: readonly DocumentPhoto[];
  onChange: (photos: DocumentPhoto[]) => void;
  /** Whether the app lock is on; if not, the field suggests it. */
  appLockOn: boolean;
}) {
  const theme = useTheme();
  const [viewing, setViewing] = useState<number | null>(null);

  if (!attachmentsSupported) return null;

  const viewable = value.filter((p): p is DocumentPhoto & { uri: string } => p.uri != null);

  const add = async (source: () => Promise<PickedPhoto | null>) => {
    try {
      const photo = await source();
      if (photo) onChange([...value, { key: `new-${nextKey++}`, uri: photo.uri, mimeType: photo.mimeType }]);
    } catch (error) {
      showMessage('Couldn’t add the photo', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <View style={styles.field}>
      {value.length > 0 ? (
        <View style={styles.thumbnails}>
          {value.map((photo, index) => (
            <View key={photo.key}>
              {photo.uri ? (
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`View photo ${index + 1}`}
                  onPress={() => setViewing(viewable.indexOf(photo as DocumentPhoto & { uri: string }))}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[styles.thumbnail, { borderColor: theme.border }]}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <View
                  accessibilityLabel={`Photo ${index + 1} can’t be opened on this phone`}
                  style={[styles.thumbnail, styles.unreadable, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.unreadableText}>
                    Can’t open
                  </ThemedText>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                hitSlop={6}
                onPress={() => onChange(value.filter((p) => p.key !== photo.key))}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
                <Icon name="clear" color={theme.danger} size={22} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {value.length < MAX_DOCUMENT_PHOTOS ? (
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title="Take photo" variant="secondary" onPress={() => add(takePhoto)} />
          </View>
          <View style={styles.button}>
            <Button title="Choose photo" variant="secondary" onPress={() => add(choosePhoto)} />
          </View>
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Photos are encrypted and stored only on this phone.
        {appLockOn ? '' : ' To keep others from seeing them, turn on the app lock in Settings.'}
      </ThemedText>

      <PhotoViewer
        uris={viewable.map((p) => p.uri)}
        index={viewing}
        onIndexChange={setViewing}
        onClose={() => setViewing(null)}
        label="Document photo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.three,
  },
  thumbnails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  thumbnail: {
    width: 72,
    height: 96,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unreadable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.one,
  },
  unreadableText: {
    textAlign: 'center',
  },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
