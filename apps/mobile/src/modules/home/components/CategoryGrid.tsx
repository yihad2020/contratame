import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { getCategoryIcon, toGridRows } from '@/modules/home/home-model';
import type { MarketplaceCategory } from '@/modules/marketplace/types';

const COLUMNS = 4;

type CategoryGridProps = {
  categories: MarketplaceCategory[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (category: MarketplaceCategory) => void;
};

export function CategoryGrid({ categories, loading, error, onRetry, onSelect }: CategoryGridProps) {
  if (loading && categories.length === 0) {
    return <View style={styles.state}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (error && categories.length === 0) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorText}>{error}</Text>
        <AppButton label="Reintentar" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {toGridRows(categories, COLUMNS).map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((category, cellIndex) => category ? (
            <PressableScale
              key={category.id}
              accessibilityLabel={`Buscar profesionales de ${category.name}`}
              accessibilityRole="button"
              containerStyle={styles.cell}
              onPress={() => onSelect(category)}
              style={styles.cellInner}
            >
              <View style={styles.tile}>
                <AppIcon name={getCategoryIcon(category.icon_key)} color={colors.navy} size={sizing.iconLg} />
              </View>
              <Text numberOfLines={1} style={styles.label}>{category.name}</Text>
            </PressableScale>
          ) : <View key={`empty-${rowIndex}-${cellIndex}`} style={styles.cell} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
  cellInner: { alignItems: 'center', gap: spacing.sm },
  tile: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 88,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: -0.1 },
  state: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  errorState: { gap: spacing.md },
  errorText: { color: colors.textSecondary, ...typography.body },
});
