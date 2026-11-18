import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/ui/FormField';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Kit';
import { PillButton } from '@/components/ui/PillButton';
import { sizing, ui, uiRadii } from '@/constants/theme';
import type { MarketplaceFilterDraft, MarketplaceSort } from '@/modules/marketplace/types';
import type { PricingType } from '@/modules/worker/types';
import { weekdayLabels } from '@/modules/worker/types';

type FiltersProps = {
  draft: MarketplaceFilterDraft;
  errors: Record<string, string>;
  busy: boolean;
  onChange(next: MarketplaceFilterDraft): void;
  onApply(): void;
  onClear(): void;
};

export function MarketplaceFilters({ draft, errors, busy, onChange, onApply, onClear }: FiltersProps) {
  const set = <K extends keyof MarketplaceFilterDraft>(key: K, value: MarketplaceFilterDraft[K]) => onChange({ ...draft, [key]: value });
  const pricingOptions: { label: string; value: '' | PricingType }[] = [
    { label: 'Todos', value: '' }, { label: 'Hora', value: 'hourly' }, { label: 'Día', value: 'daily' },
    { label: 'Fijo', value: 'fixed' }, { label: 'Cotización', value: 'quote' },
  ];
  const sortOptions: { label: string; value: MarketplaceSort; disabled?: boolean }[] = [
    { label: 'Predeterminado', value: 'default' },
    { label: 'Distancia', value: 'distance', disabled: !draft.location },
    { label: 'Experiencia', value: 'experience_desc' },
    { label: 'Precio', value: 'price_asc', disabled: !['hourly', 'daily', 'fixed'].includes(draft.pricingType) },
  ];
  return (
    <Card style={styles.panel}>
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}><Icon color={ui.accent} name="tune-variant" size={20} /></View>
        <Text style={styles.title}>Filtros</Text>
      </View>
      <View style={styles.fieldsRow}>
        <View style={styles.field}><FormField label="Ciudad" value={draft.city} onChangeText={(value) => set('city', value)} error={errors.city} placeholder="Santa Cruz de la Sierra" /></View>
        <View style={styles.field}><FormField label="Departamento" value={draft.department} onChangeText={(value) => set('department', value)} error={errors.department} placeholder="Santa Cruz" /></View>
      </View>
      <FilterGroup label="Tipo de precio" options={pricingOptions} value={draft.pricingType} onChange={(value) => set('pricingType', value)} />
      <View style={styles.fieldsRow}>
        <View style={styles.field}><FormField keyboardType="decimal-pad" label="Precio mínimo" value={draft.minPriceText} onChangeText={(value) => set('minPriceText', value)} error={errors.minPrice} placeholder="Bs" /></View>
        <View style={styles.field}><FormField keyboardType="decimal-pad" label="Precio máximo" value={draft.maxPriceText} onChangeText={(value) => set('maxPriceText', value)} error={errors.maxPrice} placeholder="Bs" /></View>
      </View>
      <FormField keyboardType="number-pad" label="Experiencia mínima" value={draft.minYearsText} onChangeText={(value) => set('minYearsText', value)} error={errors.experience} placeholder="Años" />
      <FilterGroup
        label="Disponibilidad"
        options={[{ label: 'Cualquier día', value: '' }, ...weekdayLabels.map((label, day) => ({ label, value: String(day) }))]}
        value={draft.availabilityDay}
        onChange={(value) => set('availabilityDay', value)}
      />
      {errors.availability ? <Text style={styles.error}>{errors.availability}</Text> : null}
      {draft.location ? <FormField keyboardType="number-pad" label="Radio máximo opcional (km)" value={draft.radiusKm} onChangeText={(value) => set('radiusKm', value)} error={errors.radius} helperText="Vacío usa únicamente el radio de atención de cada profesional. Máximo 50 km." /> : null}
      <FilterGroup label="Ordenar" options={sortOptions} value={draft.sort} onChange={(value) => set('sort', value)} />
      {errors.sort ? <Text style={styles.error}>{errors.sort}</Text> : null}
      <View style={styles.actions}>
        <View style={styles.action}><PillButton label="Limpiar" variant="soft" disabled={busy} onPress={onClear} /></View>
        <View style={styles.action}><PillButton label="Aplicar filtros" loading={busy} onPress={onApply} /></View>
      </View>
    </Card>
  );
}

function FilterGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: T; disabled?: boolean }[];
  value: T;
  onChange(value: T): void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: option.disabled }}
              disabled={option.disabled}
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected, option.disabled && styles.chipDisabled]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 18, padding: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.accentSoft },
  title: { color: ui.ink, fontSize: 21, lineHeight: 28, fontWeight: '700' },
  fieldsRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  group: { gap: 8 },
  label: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizing.touchTarget, justifyContent: 'center', paddingHorizontal: 16, borderRadius: uiRadii.pill, borderWidth: 1.5, borderColor: ui.tag, backgroundColor: ui.tag },
  chipSelected: { borderColor: ui.accent, backgroundColor: ui.accent },
  chipDisabled: { opacity: 0.4 },
  chipLabel: { color: ui.inkSoft, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  chipLabelSelected: { color: ui.white },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
