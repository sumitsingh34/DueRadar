type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes to any change in stored data. Returns an unsubscribe function. */
export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called after every write so screens and reminders can refresh. */
export function emitDataChanged(): void {
  for (const listener of listeners) listener();
}
