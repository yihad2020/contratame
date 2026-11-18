import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { AppIconName } from '@/components/ui/AppIcon';
import { ui } from '@/constants/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Filled icon set used by the UI-03 redesign (the mockups use solid glyphs). */
export function Icon({ name, size = 22, color = ui.ink }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons accessibilityElementsHidden importantForAccessibility="no" color={color} name={name} size={size} />;
}

/** Bridges legacy `AppIconName` values (still used by callers) to the filled set. */
export const appIconGlyph: Record<AppIconName, IconName> = {
  account: 'account',
  back: 'arrow-left',
  briefcase: 'briefcase',
  chat: 'message-processing',
  check: 'check-circle',
  chevronRight: 'chevron-right',
  edit: 'pencil',
  error: 'alert-circle',
  eye: 'eye',
  eyeOff: 'eye-off',
  filter: 'tune-variant',
  heart: 'heart',
  home: 'home',
  info: 'information',
  image: 'image',
  lock: 'lock',
  location: 'map-marker',
  logout: 'logout',
  mail: 'email-outline',
  notifications: 'bell',
  plus: 'plus',
  refresh: 'refresh',
  report: 'flag',
  requests: 'text-box',
  send: 'send',
  search: 'magnify',
  star: 'star',
  time: 'clock-time-four',
  trash: 'delete',
  tools: 'hammer-wrench',
};

/** Category glyphs keyed by `service_categories.icon_key` (with slug fallbacks). */
const categoryGlyphs: Record<string, { name: IconName; color: string }> = {
  water: { name: 'faucet', color: ui.ink },
  plomeria: { name: 'faucet', color: ui.ink },
  bolt: { name: 'flash', color: ui.accent },
  electricidad: { name: 'flash', color: ui.accent },
  cleaning: { name: 'broom', color: ui.accent },
  limpieza: { name: 'broom', color: ui.accent },
  paint: { name: 'format-paint', color: ui.accent },
  pintura: { name: 'format-paint', color: ui.accent },
  carpentry: { name: 'hand-saw', color: ui.ink },
  carpinteria: { name: 'hand-saw', color: ui.ink },
  construction: { name: 'hard-hat', color: ui.accent },
  construccion: { name: 'hard-hat', color: ui.accent },
  garden: { name: 'flower', color: ui.green },
  jardineria: { name: 'flower', color: ui.green },
  mechanic: { name: 'car-wrench', color: ui.ink },
  mecanica: { name: 'car-wrench', color: ui.ink },
};

export function categoryGlyph(key?: string | null, slug?: string | null): { name: IconName; color: string } {
  return (key && categoryGlyphs[key]) || (slug && categoryGlyphs[slug]) || { name: 'hammer-wrench', color: ui.ink };
}

/** Best-effort glyph from a free-text title (e.g. a service title) when no category key is available. */
export function glyphForText(text?: string | null): IconName {
  const value = (text ?? '').toLowerCase();
  if (/plom|fuga|grif|tuber|agua|cañer/.test(value)) return 'faucet';
  if (/el[eé]ctr|luz|lumin|enchuf|cable/.test(value)) return 'flash';
  if (/limp|aseo/.test(value)) return 'broom';
  if (/pint/.test(value)) return 'format-paint';
  if (/carpin|madera|mueble/.test(value)) return 'hand-saw';
  if (/jard|pasto|poda/.test(value)) return 'flower';
  if (/mec[aá]n|auto|motor/.test(value)) return 'car-wrench';
  if (/constr|alba|obra/.test(value)) return 'hard-hat';
  return 'hammer-wrench';
}
