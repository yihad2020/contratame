import { allowedReportReasons, normalizeReportText, normalizeUserReport, reportTextLength, validateReportInput } from '@/modules/report/report-model';
import { reportFailureMessage } from '@/modules/report/report-errors';

describe('MOD-12 report model', () => {
  test('normalizes repeated and surrounding whitespace', () => expect(normalizeReportText('  un\n reporte   suficientemente claro  ')).toBe('un reporte suficientemente claro'));
  test('counts Unicode code points', () => expect(reportTextLength('😀😀')).toBe(2));
  test('restricts profile reasons', () => expect(allowedReportReasons('profile')).toEqual(['misleading_profile', 'inappropriate_behavior', 'other']));
  test('booking accepts all seven reasons', () => expect(allowedReportReasons('booking')).toHaveLength(7));
  test('rejects short and overlong descriptions without truncation', () => {
    expect(validateReportInput('profile', 'other', 'muy corto').ok).toBe(false);
    expect(validateReportInput('booking', 'service_issue', 'a'.repeat(2001)).ok).toBe(false);
  });
  test('accepts exact normalized limits', () => {
    expect(validateReportInput('profile', 'other', 'a'.repeat(20)).ok).toBe(true);
    expect(validateReportInput('booking', 'harassment', '😀'.repeat(2000)).ok).toBe(true);
  });
  test('rejects a profile-only booking reason', () => expect(validateReportInput('profile', 'fraud_or_scam', 'a'.repeat(20)).ok).toBe(false));
  test('normalizes only a safe reporter-visible contract', () => expect(normalizeUserReport({ report_id: '11111111-1111-4111-8111-111111111111', context_type: 'profile', reported_display_name: null, reported_context_available: false, booking_id: null, reason: 'other', description: 'a'.repeat(20), status: 'open', created_at: '2026-10-22T00:00:00Z', reviewed_at: null })).toMatchObject({ status: 'open', booking_id: null }));
  test('maps duplicate and internal failures to safe messages', () => {
    expect(reportFailureMessage({ code: '23505', message: 'duplicate report' })).toContain('Ya enviaste');
    expect(reportFailureMessage({ code: 'XX000', message: 'secret SQL detail' })).not.toContain('secret');
  });
});
