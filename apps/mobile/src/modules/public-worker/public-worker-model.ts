import type {
  PortfolioSignedUrl,
  PublicWorkerPortfolioItem,
  PublicWorkerProfile,
  PublicWorkerProfileRpcRow,
} from '@/modules/public-worker/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePublicWorkerId(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return UUID_PATTERN.test(clean) ? clean.toLowerCase() : null;
}

export function normalizePublicWorkerProfile(row: PublicWorkerProfileRpcRow): PublicWorkerProfile {
  return {
    ...row,
    years_experience: row.years_experience === null ? null : Number(row.years_experience),
    service_radius_m: Number(row.service_radius_m),
    services: row.services.map((service) => ({
      ...service,
      price_bob: service.price_bob === null || service.price_bob === undefined
        ? null
        : Number(service.price_bob),
    })),
    portfolio: row.portfolio.map((item) => ({ ...item, signed_url: null })),
  };
}

export function attachPortfolioSignedUrls(
  items: PublicWorkerPortfolioItem[],
  signedUrls: PortfolioSignedUrl[],
) {
  const byPath = new Map(
    signedUrls
      .filter((entry) => !entry.error && entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl as string]),
  );
  const portfolio = items.map((item) => ({
    ...item,
    signed_url: byPath.get(item.storage_path) ?? null,
  }));
  return {
    portfolio,
    hasFailures: portfolio.some((item) => item.signed_url === null),
  };
}

export function formatServiceRadius(radiusM: number) {
  const kilometres = radiusM / 1000;
  return `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(kilometres)} km`;
}
