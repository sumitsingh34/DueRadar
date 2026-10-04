/** React Native's Alert does nothing on web, so use the browser dialog. */
export function confirmAsync(title: string, message: string, _confirmLabel: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
