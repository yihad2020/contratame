/**
 * Presentation-only date helpers for the chat screens (day separators, compact list times).
 * All values are shown in Bolivia's time zone, like the rest of the chat module.
 */
const CHAT_TIME_ZONE = 'America/La_Paz';

const dayKeyFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: CHAT_TIME_ZONE,
});

/** Calendar day (in La Paz) of an ISO timestamp, as a comparable `MM/DD/YYYY` key. */
export function chatDayKey(value: string | Date) {
  return dayKeyFormat.format(typeof value === 'string' ? new Date(value) : value);
}

function dayOffsetFromToday(value: string, now: Date) {
  const key = chatDayKey(value);
  if (key === chatDayKey(now)) return 0;
  if (key === chatDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 1;
  return null;
}

/** Label for the centred day separator: "Hoy, 15 de marzo", "Ayer, 14 de marzo", "3 de enero de 2025". */
export function formatChatDayLabel(value: string, now = new Date()) {
  const date = new Date(value);
  const sameYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: CHAT_TIME_ZONE }).format(date)
    === new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: CHAT_TIME_ZONE }).format(now);
  const label = new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' as const }),
    timeZone: CHAT_TIME_ZONE,
  }).format(date);
  const offset = dayOffsetFromToday(value, now);
  if (offset === 0) return `Hoy, ${label}`;
  if (offset === 1) return `Ayer, ${label}`;
  return label;
}

/** Compact time for the conversation list: hour today, "Ayer" yesterday, short date otherwise. */
export function formatChatListTime(value: string, now = new Date()) {
  const offset = dayOffsetFromToday(value, now);
  if (offset === 0) {
    return new Intl.DateTimeFormat('es-BO', { hour: 'numeric', minute: '2-digit', timeZone: CHAT_TIME_ZONE }).format(new Date(value));
  }
  if (offset === 1) return 'Ayer';
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: CHAT_TIME_ZONE }).format(new Date(value));
}
