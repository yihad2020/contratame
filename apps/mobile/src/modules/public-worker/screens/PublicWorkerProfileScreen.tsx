import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, categoryGlyph, glyphForText } from '@/components/ui/Icon';
import { Card, IconBubble, SectionTitle, StatusPill, Tag } from '@/components/ui/Kit';
import { MarketplaceHeader } from '@/components/ui/MarketplaceHeader';
import { MarketplaceNav } from '@/components/ui/MarketplaceNav';
import { PillButton } from '@/components/ui/PillButton';
import { Screen } from '@/components/ui/Screen';
import { StarRating } from '@/components/ui/StarRating';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, ui, uiRadii } from '@/constants/theme';
import { favoriteFailureMessage } from '@/modules/favorite/favorite-errors';
import {
  addWorkerFavorite,
  getWorkerFavoriteState,
  removeWorkerFavorite,
} from '@/modules/favorite/favorite-service';
import { formatMarketplacePrice } from '@/modules/marketplace/validation';
import { publicWorkerFailureMessage } from '@/modules/public-worker/public-worker-errors';
import {
  businessClock,
  formatAvailabilityDays,
  formatAvailabilityHours,
  formatServiceRadius,
  groupAvailability,
  isWithinWeeklyAvailability,
  normalizePublicWorkerId,
} from '@/modules/public-worker/public-worker-model';
import { loadPublicWorkerProfile } from '@/modules/public-worker/public-worker-service';
import type {
  PublicWorkerPortfolioItem,
  PublicWorkerProfile,
  PublicWorkerProfileLoad,
  PublicWorkerService,
} from '@/modules/public-worker/types';
import { ReviewCard } from '@/modules/review/components/ReviewCard';
import { weekdayLabels } from '@/modules/worker/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; value: PublicWorkerProfileLoad };

const BAR_TITLE = 'Perfil profesional';

function goBack() {
  router.back();
}

function openReport(workerId: string) {
  router.push({ pathname: '/(app)/worker/[workerId]/report', params: { workerId } } as never);
}

function openRequest(workerId: string) {
  router.push({ pathname: '/(app)/worker/[workerId]/request', params: { workerId } } as never);
}

export function PublicWorkerProfileScreen({ workerIdParam }: { workerIdParam: string | string[] | undefined }) {
  const workerId = normalizePublicWorkerId(workerIdParam);
  if (!workerId) {
    return (
      <Screen
        contentStyle={styles.stateScreen}
        footer={<MarketplaceNav active="explore" />}
        header={<MarketplaceHeader back={goBack} barTitle={BAR_TITLE} />}
      >
        <UnavailableProfile validId={false} />
      </Screen>
    );
  }
  return <ValidPublicWorkerProfile key={workerId} workerId={workerId} />;
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

  if (state.kind !== 'ready') {
    return (
      <Screen
        contentStyle={styles.stateScreen}
        footer={<MarketplaceNav active="explore" />}
        header={<MarketplaceHeader back={goBack} barTitle={BAR_TITLE} />}
      >
        {state.kind === 'loading' ? <LoadingProfile /> : null}
        {state.kind === 'unavailable' ? <UnavailableProfile validId /> : null}
        {state.kind === 'error' ? <ErrorProfile message={state.message} retry={retry} /> : null}
      </Screen>
    );
  }

  const { profile } = state.value;
  return (
    <Screen
      contentStyle={styles.screen}
      footer={<ProfileActions workerId={profile.worker_id} />}
      header={(
        <MarketplaceHeader
          action={{ label: 'Reportar perfil', icon: 'dots-horizontal', onPress: () => openReport(profile.worker_id) }}
          back={goBack}
          barTitle={BAR_TITLE}
          overlap={<IdentityCard value={state.value} />}
          overlapInset={96}
        />
      )}
    >
      <ReadyProfile value={state.value} />
    </Screen>
  );
}

function LoadingProfile() {
  return (
    <Card style={styles.stateCard}>
      <View accessibilityRole="progressbar" style={styles.stateBody}>
        <ActivityIndicator color={ui.accent} size="large" />
        <Text style={styles.stateTitle}>Cargando perfil profesional…</Text>
        <Text style={styles.stateText}>Estamos consultando la información pública vigente.</Text>
      </View>
    </Card>
  );
}

function UnavailableProfile({ validId }: { validId: boolean }) {
  return (
    <Card style={styles.stateCard}>
      <View style={styles.stateBody}>
        <IconBubble name="briefcase" size={64} variant="soft" />
        <Text style={styles.stateTitle}>Perfil no disponible</Text>
        <Text style={styles.stateText}>{validId
          ? 'Este profesional ya no está disponible públicamente o el perfil no existe.'
          : 'El identificador del profesional no es válido.'}</Text>
      </View>
      <PillButton label="Volver a Explorar" variant="outline" onPress={() => router.replace('/(app)/explore' as never)} />
    </Card>
  );
}

function ErrorProfile({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card style={styles.stateCard}>
      <ErrorMessage>{message}</ErrorMessage>
      <PillButton icon="refresh" label="Reintentar" onPress={retry} />
      <PillButton label="Volver a Explorar" variant="outline" onPress={() => router.replace('/(app)/explore' as never)} />
    </Card>
  );
}

function uniqueCategories(services: PublicWorkerService[]) {
  return [...new Set(services.map((service) => service.category_name).filter(Boolean))];
}

function locationLabel(profile: PublicWorkerProfile) {
  const place = [profile.public_area_label, profile.city].filter(Boolean).join(' · ');
  const includesDepartment = profile.department
    && profile.city.toLowerCase().includes(profile.department.toLowerCase());
  return profile.department && !includesDepartment ? `${place}, ${profile.department}` : place;
}

function IdentityCard({ value }: { value: PublicWorkerProfileLoad }) {
  const { profile, reputation } = value;
  const categories = uniqueCategories(profile.services);
  const experience = profile.years_experience === null
    ? 'Experiencia no indicada'
    : `${profile.years_experience} años de experiencia`;
  return (
    <Card style={styles.identity}>
      <View style={styles.identityRow}>
        <Avatar badge={profile.is_verified ? 'verified' : undefined} name={profile.display_name} size={92} />
        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text accessibilityRole="header" style={styles.name}>{profile.display_name}</Text>
            {profile.is_verified ? (
              <View accessible accessibilityLabel="Verificado por Contrátame" style={styles.seal}>
                <Icon color={ui.accent} name="check-decagram" size={22} />
              </View>
            ) : null}
          </View>
          {categories.length ? <Text numberOfLines={2} style={styles.category}>{categories.join(' · ')}</Text> : null}
          <StarRating count={reputation.review_count} size={15} value={reputation.average_rating} />
          <View style={styles.locationRow}>
            <Icon color={ui.inkSoft} name="map-marker" size={18} />
            <Text style={styles.location}>{locationLabel(profile)}</Text>
          </View>
        </View>
      </View>
      {profile.services.length ? (
        <View style={styles.tags}>
          {profile.services.map((service) => <Tag key={service.service_id} label={service.title} />)}
        </View>
      ) : null}
      {profile.professional_bio ? <Text style={styles.bio}>{profile.professional_bio}</Text> : null}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon color={ui.accent} name="briefcase" size={16} />
          <Text style={styles.meta}>{experience}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon color={ui.green} name="map-marker-radius" size={16} />
          <Text style={styles.meta}>Radio de servicio: {formatServiceRadius(profile.service_radius_m)}</Text>
        </View>
      </View>
    </Card>
  );
}

function ReadyProfile({ value }: { value: PublicWorkerProfileLoad }) {
  const { profile } = value;
  return (
    <>
      <Section title="Servicios">
        {profile.services.length ? (
          <ScrollView horizontal contentContainerStyle={styles.hScroll} showsHorizontalScrollIndicator={false} style={styles.hScrollOuter}>
            {profile.services.map((service) => <ServiceCard key={service.service_id} service={service} />)}
          </ScrollView>
        ) : <Text style={styles.muted}>Este profesional no tiene servicios activos publicados.</Text>}
      </Section>

      {profile.services.length ? (
        <Section title="Precios">
          {profile.services.map((service) => (
            <Card
              accessibilityLabel={`${service.title}, ${formatMarketplacePrice(service.pricing_type, service.price_bob)}. Solicitar servicio`}
              key={service.service_id}
              onPress={() => openRequest(profile.worker_id)}
              style={styles.priceRow}
            >
              <View style={styles.priceCopy}>
                <Text numberOfLines={2} style={styles.priceTitle}>{service.title}</Text>
                <Text numberOfLines={1} style={styles.priceSubtitle}>{service.category_name}</Text>
              </View>
              <Text numberOfLines={2} style={styles.priceValue}>{formatMarketplacePrice(service.pricing_type, service.price_bob)}</Text>
              <Icon color={ui.inkSoft} name="chevron-right" size={24} />
            </Card>
          ))}
        </Section>
      ) : null}

      <AvailabilitySection profile={profile} />
      <PortfolioSection value={value} />
      <ReviewsSection value={value} />

      <View style={styles.moreActions}>
        <FavoriteControl workerId={profile.worker_id} />
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => openReport(profile.worker_id)}
          style={({ pressed }) => [styles.reportLink, pressed && styles.pressed]}
        >
          <Icon color={ui.muted} name="flag" size={18} />
          <Text style={styles.reportLabel}>Reportar perfil</Text>
        </Pressable>
      </View>
    </>
  );
}

function ServiceCard({ service }: { service: PublicWorkerService }) {
  const category = categoryGlyph(service.category_icon_key, service.category_slug);
  const glyph = category.name === 'hammer-wrench' ? glyphForText(service.title) : category.name;
  return (
    <Card style={styles.serviceCard}>
      <Icon color={ui.ink} name={glyph} size={34} />
      <View style={styles.serviceCopy}>
        <Text numberOfLines={2} style={styles.serviceTitle}>{service.title}</Text>
        <Text numberOfLines={3} style={styles.serviceText}>{service.description || service.category_name}</Text>
      </View>
    </Card>
  );
}

function AvailabilitySection({ profile }: { profile: PublicWorkerProfile }) {
  const groups = groupAvailability(profile.availability);
  const availableNow = isWithinWeeklyAvailability(profile.availability, businessClock(new Date()));
  return (
    <Section title="Disponibilidad">
      <Card style={styles.availabilityCard}>
        <IconBubble name="calendar-month" shape="square" size={48} variant="solid" />
        <View style={styles.availabilityCopy}>
          {groups.length ? groups.map((group) => (
            <View key={`${group.start_time}-${group.end_time}`}>
              <Text style={styles.availabilityDays}>{formatAvailabilityDays(group.days, weekdayLabels)}</Text>
              <Text style={styles.availabilityHours}>{formatAvailabilityHours(group.start_time, group.end_time)}</Text>
            </View>
          )) : <Text style={styles.availabilityHours}>El profesional no publicó horarios recurrentes.</Text>}
        </View>
        {availableNow ? <StatusPill dot label="Disponible ahora" tone="success" /> : null}
      </Card>
    </Section>
  );
}

function PortfolioSection({ value }: { value: PublicWorkerProfileLoad }) {
  const { portfolio } = value.profile;
  const [expanded, setExpanded] = useState(false);
  const hasDetails = portfolio.some((item) => item.title || item.description);
  return (
    <Section
      actionLabel={hasDetails ? (expanded ? 'Ver menos' : 'Ver todos') : undefined}
      onAction={hasDetails ? () => setExpanded((current) => !current) : undefined}
      title="Portafolio"
    >
      {value.portfolioImageWarning ? (
        <FeedbackMessage tone="info">Algunas imágenes no pudieron cargarse. La información del perfil sigue disponible.</FeedbackMessage>
      ) : null}
      {portfolio.length ? (
        <ScrollView horizontal contentContainerStyle={styles.hScroll} showsHorizontalScrollIndicator={false} style={styles.hScrollOuter}>
          {portfolio.map((item) => (
            <PortfolioItem key={`${item.portfolio_item_id}:${item.signed_url ?? 'missing'}`} expanded={expanded} item={item} />
          ))}
        </ScrollView>
      ) : <Text style={styles.muted}>Este profesional todavía no publicó trabajos en su portafolio.</Text>}
    </Section>
  );
}

function PortfolioItem({ item, expanded }: { item: PublicWorkerPortfolioItem; expanded: boolean }) {
  const [failed, setFailed] = useState(!item.signed_url);
  const title = item.title || 'Trabajo realizado';
  const imageStyle = expanded ? styles.portfolioImageLarge : styles.portfolioThumb;
  return (
    <View accessible={!expanded} accessibilityLabel={title} style={expanded ? styles.portfolioCard : undefined}>
      {!failed && item.signed_url ? (
        <Image source={{ uri: item.signed_url }} resizeMode="cover" onError={() => setFailed(true)} style={imageStyle} />
      ) : (
        <View style={[imageStyle, styles.imageFallback]}><Icon color={ui.subtle} name="image" size={32} /></View>
      )}
      {expanded ? (
        <>
          <Text numberOfLines={2} style={styles.portfolioTitle}>{title}</Text>
          {item.description ? <Text numberOfLines={3} style={styles.portfolioText}>{item.description}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

function ReviewsSection({ value }: { value: PublicWorkerProfileLoad }) {
  const { reviews, review_count: reviewCount } = value.reputation;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, 1);
  return (
    <Section
      actionLabel={reviews.length > 1 ? (showAll ? 'Ver menos' : 'Ver todas') : undefined}
      onAction={reviews.length > 1 ? () => setShowAll((current) => !current) : undefined}
      title="Reseñas"
    >
      {visible.length ? visible.map((review) => <ReviewCard key={review.review_id} review={review} />)
        : <Text style={styles.muted}>No hay reseñas todavía.</Text>}
      {showAll && reviewCount > reviews.length ? (
        <Text style={styles.muted}>Se muestran las {reviews.length} reseñas más recientes.</Text>
      ) : null}
    </Section>
  );
}

function ProfileActions({ workerId }: { workerId: string }) {
  return (
    <View style={styles.footer}>
      <PillButton
        accessibilityLabel="Abrir mis mensajes"
        icon="message-processing"
        label="Mis mensajes"
        style={styles.footerButton}
        variant="outline"
        onPress={() => router.push('/(app)/chats' as never)}
      />
      <PillButton
        icon="calendar-month"
        label="Solicitar servicio"
        style={styles.footerButton}
        onPress={() => openRequest(workerId)}
      />
    </View>
  );
}

function FavoriteControl({ workerId }: { workerId: string }) {
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busyRef = useRef(false);

  useEffect(() => {
    let current = true;
    void getWorkerFavoriteState(workerId)
      .then((value) => {
        if (!current) return;
        setIsFavorite(value);
        setFailure(null);
      })
      .catch((cause) => {
        if (current) setFailure(favoriteFailureMessage(cause));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [attempt, workerId]);

  async function toggle() {
    if (busyRef.current || isFavorite === null) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      const result = isFavorite
        ? await removeWorkerFavorite(workerId)
        : await addWorkerFavorite(workerId);
      setIsFavorite(result.isFavorite);
      setNotice(result.isFavorite
        ? 'Profesional agregado a tus favoritos.'
        : 'Profesional eliminado de tus favoritos.');
    } catch (cause) {
      setFailure(favoriteFailureMessage(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (loading) return <PillButton disabled icon="heart-outline" label="Consultando favorito…" variant="soft" onPress={() => {}} />;
  if (failure && isFavorite === null) {
    return (
      <View style={styles.favoriteFeedback}>
        <ErrorMessage>{failure}</ErrorMessage>
        <PillButton icon="refresh" label="Reintentar favorito" variant="outline" onPress={() => {
          setLoading(true);
          setAttempt((current) => current + 1);
        }} />
      </View>
    );
  }
  return (
    <View style={styles.favoriteFeedback}>
      {notice ? <FeedbackMessage>{notice}</FeedbackMessage> : null}
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
      <PillButton
        icon={isFavorite ? 'heart' : 'heart-outline'}
        label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        loading={busy}
        variant="soft"
        onPress={() => void toggle()}
      />
    </View>
  );
}

function Section({ title, children, actionLabel, onAction }: { title: string; children: ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <SectionTitle actionLabel={actionLabel} onAction={onAction} title={title} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingTop: 12 },
  stateScreen: { gap: 14, paddingTop: 20 },
  stateCard: { minHeight: 260, gap: 14, justifyContent: 'center', padding: 24 },
  stateBody: { alignItems: 'center', gap: 12 },
  stateTitle: { color: ui.ink, fontSize: 19, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
  stateText: { color: ui.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.7 },

  identity: { gap: 14, padding: 18 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  identityCopy: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { flexShrink: 1, color: ui.ink, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  seal: { justifyContent: 'center' },
  category: { color: ui.inkSoft, fontSize: 16, lineHeight: 21 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  location: { flex: 1, color: ui.muted, fontSize: 14, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bio: { color: ui.muted, fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: ui.inkSoft, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  section: { gap: 8 },
  muted: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  hScrollOuter: { flexGrow: 0, marginHorizontal: -4 },
  hScroll: { gap: 10, paddingHorizontal: 4, paddingVertical: 6 },

  serviceCard: { width: 176, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: uiRadii.lg },
  serviceCopy: { flex: 1, gap: 4 },
  serviceTitle: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  serviceText: { color: ui.muted, fontSize: 13, lineHeight: 17 },

  priceRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderRadius: uiRadii.md },
  priceCopy: { flex: 1, gap: 2 },
  priceTitle: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  priceSubtitle: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  priceValue: { maxWidth: 140, color: ui.ink, fontSize: 17, lineHeight: 22, fontWeight: '800', textAlign: 'right' },

  availabilityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: uiRadii.lg },
  availabilityCopy: { flex: 1, gap: 8 },
  availabilityDays: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  availabilityHours: { color: ui.muted, fontSize: 14, lineHeight: 19 },

  portfolioThumb: { width: 96, height: 96, borderRadius: uiRadii.md, backgroundColor: ui.tag },
  portfolioCard: { width: 220, gap: 6 },
  portfolioImageLarge: { width: 220, aspectRatio: 4 / 3, borderRadius: uiRadii.lg, backgroundColor: ui.tag },
  imageFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ui.divider },
  portfolioTitle: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  portfolioText: { color: ui.muted, fontSize: 13, lineHeight: 18 },

  moreActions: { gap: 12, paddingTop: 6 },
  favoriteFeedback: { gap: 8 },
  reportLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 12 },
  reportLabel: { color: ui.muted, fontSize: 15, fontWeight: '600' },

  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: ui.card, ...shadows.nav },
  footerButton: { flex: 1, minHeight: 54, paddingHorizontal: 12 },
});
