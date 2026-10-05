import { Alert } from 'react-native';

/** Asks the user to confirm a destructive action. Web version: confirm.web.ts. */
export function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Asks the user to pick between two answers, or cancel. Resolves with the
 * chosen answer's value, or null when cancelled.
 */
export function chooseAsync<T>(
  title: string,
  message: string,
  answers: readonly [{ label: string; value: T }, { label: string; value: T }],
): Promise<T | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ...answers.map((answer) => ({ text: answer.label, onPress: () => resolve(answer.value) })),
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Asks what to do with a form's unsaved changes when leaving it. */
export function askAboutUnsavedChanges(): Promise<'save' | 'discard' | 'keep'> {
  return new Promise((resolve) => {
    Alert.alert(
      'Save your changes?',
      'If you leave without saving, they’ll be lost.',
      [
        // On Android the first button sits on its own on the left.
        { text: 'Keep editing', style: 'cancel', onPress: () => resolve('keep') },
        { text: 'Discard', style: 'destructive', onPress: () => resolve('discard') },
        { text: 'Save', onPress: () => resolve('save') },
      ],
      { cancelable: true, onDismiss: () => resolve('keep') },
    );
  });
}

/** Shows a short message with an OK button. */
export function showMessage(title: string, message: string): void {
  Alert.alert(title, message);
}
