import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add', fallback: '+' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right', fallback: '›' },
  delete: { ios: 'trash', android: 'delete', web: 'delete', fallback: '✕' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit', fallback: '✎' },
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
