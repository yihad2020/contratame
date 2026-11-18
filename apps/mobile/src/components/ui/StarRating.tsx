import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { ui } from '@/constants/theme';

/** Five filled stars plus "4.9 (124)". Renders an honest empty label when there are no reviews. */
export function StarRating({ value, count, size = 16, emptyLabel = 'Sin reseñas aún', countSuffix }: {
  value: number | null;
  count?: number | null;
  size?: number;
  emptyLabel?: string;
  countSuffix?: string;
}) {
  if (value === null || !Number.isFinite(value) || count === 0) {
    return <Text style={[styles.empty, { fontSize: size - 1 }]}>{emptyLabel}</Text>;
  }
  const stars: IconName[] = [0, 1, 2, 3, 4].map((index) => {
    const remaining = value - index;
    return remaining >= 0.75 ? 'star' : remaining >= 0.25 ? 'star-half-full' : 'star-outline';
  });
  const formatted = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  return (
    <View
      accessibilityLabel={`${formatted} de 5 estrellas${typeof count === 'number' ? `, ${count} reseñas` : ''}`}
      style={styles.row}
    >
      <View style={styles.stars}>
        {stars.map((name, index) => <Icon key={index} color={ui.accent} name={name} size={size + 3} />)}
      </View>
      <Text style={[styles.value, { fontSize: size }]}>{formatted}</Text>
      {typeof count === 'number' ? <Text style={[styles.count, { fontSize: size }]}>({count}{countSuffix ? ` ${countSuffix}` : ''})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row' },
  value: { color: ui.ink, fontWeight: '700' },
  count: { color: ui.muted },
  empty: { color: ui.muted },
});
