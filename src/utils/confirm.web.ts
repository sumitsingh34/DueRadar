/** React Native's Alert does nothing on web, so use the browser dialogs. */
export function confirmAsync(title: string, message: string, _confirmLabel: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}

export function showMessage(title: string, message: string): void {
  window.alert(`${title}\n\n${message}`);
}
