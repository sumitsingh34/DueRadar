import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef, useState } from 'react';

import { askAboutUnsavedChanges } from '@/utils/confirm';
import { goBack } from '@/utils/navigation';

/**
 * Keeps a form from losing changes. Once `values` (the form's fields) differ
 * from what they were at first, leaving the screen with the back button or
 * gesture, or the back arrow in the header, first asks: save, discard or keep
 * editing. While `saving`, going back does nothing, since the screen closes
 * once it's saved.
 *
 * Returns `leave`, which closes the screen without asking: call it once the
 * form is saved, or what it edits is deleted.
 */
export function useUnsavedChanges({
  values,
  saving,
  save,
}: {
  values: unknown;
  saving: boolean;
  /** Saves the form, which then calls `leave`. */
  save: () => void;
}): () => void {
  const navigation = useNavigation();
  const snapshot = JSON.stringify(values);
  const [initial] = useState(snapshot);
  const leaving = useRef(false);
  const asking = useRef(false);

  usePreventRemove(snapshot !== initial || saving, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (saving || asking.current) return;
    asking.current = true;
    askAboutUnsavedChanges().then((choice) => {
      asking.current = false;
      if (choice === 'discard') navigation.dispatch(data.action);
      else if (choice === 'save') save();
    });
  });

  return useCallback(() => {
    leaving.current = true;
    // Not if another screen was opened on top while it saved.
    if (navigation.isFocused()) goBack();
  }, [navigation]);
}
