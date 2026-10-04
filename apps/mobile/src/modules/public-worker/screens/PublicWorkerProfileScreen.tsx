import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { Screen } from '@/components/ui/Screen';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { formatMarketplacePrice } from '@/modules/marketplace/validation';
import { publicWorkerFailureMessage } from '@/modules/public-worker/public-worker-errors';
import {
  formatServiceRadius,
  normalizePublicWorkerId,
} from '@/modules/public-worker/public-worker-model';
import { loadPublicWorkerProfile } from '@/modules/public-worker/public-worker-service';
import type {
  PublicWorkerPortfolioItem,
  PublicWorkerProfileLoad,
} from '@/modules/public-worker/types';
import { ReviewCard } from '@/modules/review/components/ReviewCard';
import { formatAverageRating } from '@/modules/review/review-model';
import { weekdayLabels } from '@/modules/worker/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; value: PublicWorkerProfileLoad };

export function PublicWorkerProfileScreen({ workerIdParam }: { workerIdParam: string | string[] | undefined }) {
  const workerId = normalizePublicWorkerId(workerIdParam);
  return (
    <Screen
      contentStyle={styles.screen}
      footer={<MarketplaceNav active="explore" />}
      header={<MarketplaceHeader back={() => router.back()} eyebrow="PROFESIONAL" title="Perfil público" subtitle="Información profesional y zona de servicio." />}
    >
      {workerId
        ? <ValidPublicWorkerProfile key={workerId} workerId={workerId} />
        : <UnavailableProfile validId={false} />}
    </Screen>
  );
}

function ValidPublicWorkerProfile({ workerId }: { workerId: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let current = true;
    void loadPublicWorkerProfile(workerId)
      .then((value) => {
        if (current) setState(value ? { kind: 'ready', value } : { kind: 'unavailable' });
      })
      .catch((cause) => {
        if (current) setState({ kind: 'error', message: publicWorkerFailureMessage(cause) });
      });
    return () => { current = false; };
  }, [attempt, workerId]);

  if (state.kind === 'loading') return <LoadingProfile />;
  if (state.kind === 'unavailable') return <UnavailableProfile validId />;
  if (state.kind === 'error') return <ErrorProfile message={state.message} retry={retry} />;
  return <ReadyProfile value={state.value} />;
}

function LoadingProfile() {
  return (
    <View accessibilityRole="progressbar" style={styles.stateCard}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.stateTitle}>Cargando perfil profesional…</Text>
      <Text style={styles.muted}>Estamos consultando la información pública vigente.</Text>
    </View>
  );
}

function UnavailableProfile({ validId }: { validId: boolean }) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}><AppIcon name="briefcase" color={colors.primary} size={sizing.iconLg} /></View>
      <Text style={styles.stateTitle}>Perfil no disponible</Text>
      <Text style={styles.muted}>{validId
        ? 'Este profesional ya no está disponible públicamente o el perfil no existe.'
        : 'El identificador del profesional no es válido.'}</Text>
      <AppButton label="Volver a Explorar" variant="secondary" onPress={() => router.replace('/(app)/explore' as never)} />
    </View>
  );
}

function ErrorProfile({ message, retry }: { message: string; retry: () => void }) {
  return (
    <View style={styles.stateCard}>
      <ErrorMessage>{message}</ErrorMessage>
      <AppButton label="Reintentar" onPress={retry} />
      <AppButton label="Volver a Explorar" variant="secondary" onPress={() => router.replace('/(app)/explore' as never)} />
    </View>
  );
}

function ReadyProfile({ value }: { value: PublicWorkerProfileLoad }) {
  const { profile } = value;
  const initials = profile.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <>
      <View style={styles.hero}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.name}>{profile.display_name}</Text>
          <View style={styles.locationRow}>
            <AppIcon name="location" color={colors.green} size={sizing.iconSm} />
            <Text style={styles.location}>{profile.public_area_label}, {profile.city}, {profile.department}</Text>
          </View>
          <Text style={styles.radius}>Radio de servicio: {formatServiceRadius(profile.service_radius_m)}</Text>
        </View>
        {profile.professional_bio ? <Text style={styles.bio}>{profile.professional_bio}</Text> : null}
        <Text style={styles.experience}>{profile.years_experience === null
          ? 'Experiencia no indicada'
          : `${profile.years_experience} años de experiencia`}</Text>
      </View>

      <Section title="Servicios">
        {profile.services.map((service) => (
          <View key={service.service_id} style={styles.detailRow}>
            <View style={styles.detailIcon}><AppIcon name="tools" size={sizing.iconSm} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailTitle}>{service.title}</Text>
              <Text style={styles.category}>{service.category_name}</Text>
              {service.description ? <Text style={styles.muted}>{service.description}</Text> : null}
              <Text style={styles.price}>{formatMarketplacePrice(service.pricing_type, service.price_bob)}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="Disponibilidad semanal">
        {profile.availability.length ? profile.availability.map((available, index) => (
          <View key={`${available.day_of_week}-${available.start_time}-${available.end_time}-${index}`} style={styles.detailRow}>
            <View style={[styles.detailIcon, styles.greenIcon]}><AppIcon name="time" color={colors.success} size={sizing.iconSm} /></View>
            <Text style={styles.detailTitle}>{weekdayLabels[available.day_of_week]} · {available.start_time}–{available.end_time}</Text>
          </View>
        )) : <Text style={styles.muted}>El profesional no publicó horarios recurrentes.</Text>}
      </Section>

      <Section title="Portafolio">
        {value.portfolioImageWarning ? (
          <FeedbackMessage tone="info">Algunas imágenes no pudieron cargarse. La información del perfil sigue disponible.</FeedbackMessage>
        ) : null}
        {profile.portfolio.length ? (
          <ScrollView horizontal contentContainerStyle={styles.portfolio} showsHorizontalScrollIndicator={false}>
            {profile.portfolio.map((item) => <PortfolioCard key={`${item.portfolio_item_id}:${item.signed_url ?? 'missing'}`} item={item} />)}
          </ScrollView>
        ) : <Text style={styles.muted}>Este profesional todavía no publicó trabajos en su portafolio.</Text>}
      </Section>
      <Section title="Reseñas">
        <Text style={styles.reputation}>{formatAverageRating(value.reputation.average_rating, value.reputation.review_count)}</Text>
        {value.reputation.reviews.length ? value.reputation.reviews.map((review) => (
          <ReviewCard key={review.review_id} review={review} />
        )) : <Text style={styles.muted}>No hay reseñas todavía.</Text>}
        {value.reputation.review_count > value.reputation.reviews.length ? (
          <Text style={styles.muted}>Se muestran las {value.reputation.reviews.length} reseñas más recientes.</Text>
        ) : null}
      </Section>
      <AppButton
        icon="send"
        label="Solicitar servicio"
        onPress={() => router.push({ pathname: '/(app)/worker/[workerId]/request', params: { workerId: profile.worker_id } } as never)}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function PortfolioCard({ item }: { item: PublicWorkerPortfolioItem }) {
  const [failed, setFailed] = useState(!item.signed_url);
  return (
    <View style={styles.portfolioCard}>
      {!failed && item.signed_url ? (
        <Image source={{ uri: item.signed_url }} resizeMode="cover" onError={() => setFailed(true)} style={styles.portfolioImage} />
      ) : (
        <View style={[styles.portfolioImage, styles.imageFallback]}><AppIcon name="image" color={colors.textSecondary} size={sizing.iconLg} /></View>
      )}
      <Text numberOfLines={2} style={styles.portfolioTitle}>{item.title || 'Trabajo realizado'}</Text>
      {item.description ? <Text numberOfLines={3} style={styles.muted}>{item.description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingTop: spacing.xl },
  stateCard: { minHeight: 260, gap: spacing.md, alignItems: 'stretch', justifyContent: 'center', padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  stateIcon: { width: 64, height: 64, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  stateTitle: { color: colors.navy, textAlign: 'center', ...typography.title },
  hero: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  avatar: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  initials: { color: colors.primary, ...typography.title },
  heroCopy: { gap: spacing.xs },
  name: { color: colors.navy, ...typography.title },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  location: { flex: 1, color: colors.textSecondary, ...typography.label },
  radius: { color: colors.success, ...typography.label },
  bio: { color: colors.text, ...typography.body },
  experience: { color: colors.primary, ...typography.label },
  section: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface },
  sectionTitle: { color: colors.navy, ...typography.section },
  detailRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  detailIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primarySoft },
  greenIcon: { backgroundColor: colors.greenSoft },
  detailCopy: { flex: 1, gap: spacing.xs },
  detailTitle: { flex: 1, color: colors.text, ...typography.bodyStrong },
  category: { color: colors.primary, ...typography.caption, fontWeight: '700' },
  price: { color: colors.navy, ...typography.label },
  reputation: { color: colors.warning, ...typography.bodyStrong },
  muted: { color: colors.textSecondary, ...typography.body },
  portfolio: { gap: spacing.md, paddingRight: spacing.sm },
  portfolioCard: { width: 220, gap: spacing.sm },
  portfolioImage: { width: 220, aspectRatio: 4 / 3, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  imageFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  portfolioTitle: { color: colors.text, ...typography.label },
});
