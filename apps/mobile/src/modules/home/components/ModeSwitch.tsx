import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import type { HomeMode } from '@/modules/home/home-model';

const OPTIONS: SegmentOption<HomeMode>[] = [
  { value: 'hire', label: 'Contratar', hint: 'Muestra búsqueda y profesionales' },
  { value: 'work', label: 'Trabajar', hint: 'Muestra tu perfil profesional' },
];

export function ModeSwitch({ value, onChange }: { value: HomeMode; onChange: (mode: HomeMode) => void }) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} tone="dark" />;
}
