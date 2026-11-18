import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { StarRating } from '@/components/ui/StarRating';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { formatReviewDate } from '@/modules/review/review-model';
import type { PublicReview } from '@/modules/review/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Hoy", "Ayer", "Hace 3 días", "Hace 2 semanas"… computed from the stored review date. */
function relativeReviewDate(value: string, now = Date.now()) {
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return formatReviewDate(value);
  const days = Math.max(0, Math.floor((now - created) / DAY_MS));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
}

export function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <View style={styles.card}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
        <View style={styles.avatarInner}>
          <Icon color={ui.navy} name="account" size={28} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.author}>Cliente</Text>
          <Text accessibilityLabel={`Publicada el ${formatReviewDate(review.created_at)}`} style={styles.date}>
            {relativeReviewDate(review.created_at)}
          </Text>
        </View>
        <StarRating size={14} value={review.rating} />
        <Text style={[styles.comment, !review.comment && styles.noComment]}>
          {review.comment ? `“${review.comment}”` : 'Sin comentario.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: uiRadii.lg, backgroundColor: ui.card, ...shadows.card },
  avatar: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, borderWidth: 2, borderColor: ui.accent, backgroundColor: ui.white },
  avatarInner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: ui.navySoft },
  body: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  author: { flexShrink: 1, color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  date: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  comment: { color: ui.inkSoft, fontSize: 14, lineHeight: 20 },
  noComment: { color: ui.muted },
});
