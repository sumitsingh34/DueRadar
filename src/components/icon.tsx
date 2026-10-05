import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add', fallback: '+' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right', fallback: '›' },
  clear: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel', fallback: '✕' },
  delete: { ios: 'trash', android: 'delete', web: 'delete', fallback: '✕' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit', fallback: '✎' },
  home: { ios: 'house.fill', android: 'home', web: 'home', fallback: '⌂' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search', fallback: '⌕' },
  vehicle: { ios: 'car.fill', android: 'directions_car', web: 'directions_car', fallback: '◆' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  const { fallback, ...names } = ICONS[name];
  return (
    <SymbolView
      name={names}
      size={size}
      tintColor={color}
      fallback={<Text style={{ color, fontSize: size, lineHeight: size + 2 }}>{fallback}</Text>}
    />
  );
}
