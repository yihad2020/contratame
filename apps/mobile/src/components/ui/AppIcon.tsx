import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { colors, sizing } from '@/constants/theme';

export type AppIconName =
  | 'account'
  | 'back'
  | 'briefcase'
  | 'check'
  | 'chevronRight'
  | 'edit'
  | 'error'
  | 'eye'
  | 'eyeOff'
  | 'home'
  | 'info'
  | 'image'
  | 'lock'
  | 'location'
  | 'logout'
  | 'mail'
  | 'plus'
  | 'send'
  | 'search'
  | 'time'
  | 'trash'
  | 'tools';

const symbols: Record<AppIconName, { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }> = {
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  briefcase: { ios: 'briefcase', android: 'work', web: 'work' },
  check: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  error: { ios: 'exclamationmark.triangle', android: 'error', web: 'error' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  home: { ios: 'house', android: 'home', web: 'home' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  image: { ios: 'photo', android: 'image', web: 'image' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  location: { ios: 'location', android: 'location_on', web: 'location_on' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  send: { ios: 'paperplane', android: 'send', web: 'send' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  time: { ios: 'clock', android: 'schedule', web: 'schedule' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  tools: { ios: 'hammer', android: 'handyman', web: 'handyman' },
};

export function AppIcon({ name, color = colors.primary, size = sizing.iconMd }: { name: AppIconName; color?: string; size?: number }) {
  return <SymbolView name={symbols[name]} tintColor={color} size={size} />;
}
