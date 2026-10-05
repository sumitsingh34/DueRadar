/** React Native's Alert does nothing on web, so use the browser dialogs. */
export function confirmAsync(title: string, message: string, _confirmLabel: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}

/** The browser has only OK and Cancel: OK picks the second answer, Cancel the first. */
export function chooseAsync<T>(
  title: string,
  message: string,
  answers: readonly [{ label: string; value: T }, { label: string; value: T }],
): Promise<T | null> {
  const [first, second] = answers;
  const ok = window.confirm(`${title}\n\n${message}\n\nOK: ${second.label}. Cancel: ${first.label}.`);
  return Promise.resolve(ok ? second.value : first.value);
}

export function showMessage(title: string, message: string): void {
  window.alert(`${title}\n\n${message}`);
}
