import type {
  PortfolioSignedUrl,
  PublicWorkerAvailability,
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
    is_verified: false,
    certification_expires_at: null,
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

/** Monday-first order used to present weekly availability ("Lunes - Sábado"). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const BUSINESS_TIME_ZONE = 'America/La_Paz';
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type AvailabilityGroup = { days: number[]; start_time: string; end_time: string };

function weekPosition(day: number) {
  const position = WEEK_ORDER.indexOf(day as (typeof WEEK_ORDER)[number]);
  return position === -1 ? WEEK_ORDER.length : position;
}

function toMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Groups the published weekly ranges that share the same hours, keeping every range visible. */
export function groupAvailability(availability: PublicWorkerAvailability[]): AvailabilityGroup[] {
  const groups = new Map<string, AvailabilityGroup>();
  for (const range of availability) {
    const key = `${range.start_time}|${range.end_time}`;
    const group = groups.get(key) ?? { days: [], start_time: range.start_time, end_time: range.end_time };
    if (!group.days.includes(range.day_of_week)) group.days.push(range.day_of_week);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, days: [...group.days].sort((left, right) => weekPosition(left) - weekPosition(right)) }))
    .sort((left, right) => weekPosition(left.days[0]) - weekPosition(right.days[0])
      || left.start_time.localeCompare(right.start_time));
}

/** "Lunes - Sábado", "Lunes, Miércoles", "Lunes - Viernes, Domingo". */
export function formatAvailabilityDays(days: number[], labels: readonly string[]) {
  const ordered = WEEK_ORDER.filter((day) => days.includes(day));
  const runs: number[][] = [];
  for (const day of ordered) {
    const last = runs[runs.length - 1];
    if (last && weekPosition(day) === weekPosition(last[last.length - 1]) + 1) last.push(day);
    else runs.push([day]);
  }
  return runs.map((run) => (run.length >= 3
    ? `${labels[run[0]]} - ${labels[run[run.length - 1]]}`
    : run.map((day) => labels[day]).join(', '))).join(', ');
}

/** "08:00" -> "8:00", used for the "8:00 a 18:00" line. */
export function formatAvailabilityHours(start: string, end: string) {
  const clean = (value: string) => value.slice(0, 5).replace(/^0(\d)/, '$1');
  return `${clean(start)} a ${clean(end)}`;
}

/** Current weekday and minute of day in the marketplace business time zone, or null when unavailable. */
export function businessClock(date: Date): { day: number; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const read = (type: string) => parts.find((part) => part.type === type)?.value;
    const day = WEEKDAY_INDEX[read('weekday') ?? ''];
    const hour = Number(read('hour'));
    const minute = Number(read('minute'));
    if (day === undefined || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return { day, minutes: (hour % 24) * 60 + minute };
  } catch {
    return null;
  }
}

/** True only when the clock falls inside one of the published weekly ranges. */
export function isWithinWeeklyAvailability(
  availability: PublicWorkerAvailability[],
  clock: { day: number; minutes: number } | null,
) {
  if (!clock) return false;
  return availability.some((range) => {
    const start = toMinutes(range.start_time);
    const end = toMinutes(range.end_time);
    return range.day_of_week === clock.day && start !== null && end !== null
      && clock.minutes >= start && clock.minutes < end;
  });
}
