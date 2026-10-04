import { getSettings } from '@/db/settings';
import type { AppSettings } from '@/domain/settings';
import { useLiveData } from '@/hooks/use-live-data';

/** App settings, kept up to date while the screen is focused. Null while loading. */
export function useSettings(): AppSettings | null {
  return useLiveData(getSettings);
}
