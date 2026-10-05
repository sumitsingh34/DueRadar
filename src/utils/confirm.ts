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

/** Shows a short message with an OK button. */
export function showMessage(title: string, message: string): void {
  Alert.alert(title, message);
}
