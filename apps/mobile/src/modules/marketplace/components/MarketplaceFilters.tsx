import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FormField } from '@/components/ui/FormField';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
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
    <View style={styles.panel}>
      <Text style={styles.title}>Filtros</Text>
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
        <View style={styles.action}><AppButton label="Limpiar" variant="ghost" disabled={busy} onPress={onClear} /></View>
        <View style={styles.action}><AppButton label="Aplicar filtros" loading={busy} onPress={onApply} /></View>
      </View>
    </View>
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
  panel: { gap: spacing.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  title: { color: colors.navy, ...typography.section },
  fieldsRow: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
  group: { gap: spacing.sm },
  label: { color: colors.text, ...typography.label },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: sizing.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipDisabled: { opacity: 0.4 },
  chipLabel: { color: colors.textSecondary, ...typography.label },
  chipLabelSelected: { color: colors.primary },
  error: { color: colors.danger, ...typography.caption },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
