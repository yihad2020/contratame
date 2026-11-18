import type { PricingType } from '@/modules/worker/types';

/** Splits a service price into the mockup's "Desde / Bs 70 / por hora" column. Presentation only. */
export function marketplacePriceParts(type: PricingType, priceBob: number | null): { caption: string; amount: string; unit: string | null } {
  if (type === 'quote') return { caption: 'Precio', amount: 'A cotizar', unit: null };
  const amount = priceBob === null ? '—' : new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(priceBob);
  if (type === 'hourly') return { caption: 'Desde', amount: `Bs ${amount}`, unit: 'por hora' };
  if (type === 'daily') return { caption: 'Desde', amount: `Bs ${amount}`, unit: 'por día' };
  return { caption: 'Precio fijo', amount: `Bs ${amount}`, unit: null };
}
