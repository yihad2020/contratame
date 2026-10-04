import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatRating, formatReviewDate } from '@/modules/review/review-model';
import type { PublicReview } from '@/modules/review/types';

export function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityLabel={`${review.rating} de 5 estrellas`} style={styles.stars}>
          {formatRating(review.rating)}
        </Text>
        <Text style={styles.date}>{formatReviewDate(review.created_at)}</Text>
      </View>
      <Text style={styles.comment}>{review.comment ?? 'Sin comentario.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  stars: { color: colors.warning, ...typography.bodyStrong },
  date: { color: colors.textSecondary, ...typography.caption },
  comment: { color: colors.text, ...typography.body },
});
