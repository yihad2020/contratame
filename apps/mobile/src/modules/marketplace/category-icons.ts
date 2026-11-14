import type { AppIconName } from '@/components/ui/AppIcon';

/** Maps `service_categories.icon_key` to an app icon. Unknown keys fall back to a generic icon. */
const CATEGORY_ICONS: Record<string, AppIconName> = {
  bolt: 'bolt',
  water: 'water',
  carpentry: 'carpentry',
  construction: 'construction',
  cleaning: 'cleaning',
  garden: 'garden',
  paint: 'paint',
  mechanic: 'mechanic',
};

export function getCategoryIcon(iconKey: string | null | undefined): AppIconName {
  return (iconKey && CATEGORY_ICONS[iconKey]) || 'category';
}
