import { certificationFailureMessage } from '@/modules/certification/certification-errors';
import {
  CERTIFICATION_PRICE_BOB,
  CERTIFICATION_VALIDITY_MONTHS,
  formatCertificationDate,
  formatCertificationPrice,
  indexPublicCertifications,
  normalizeCertificationState,
  shouldShowVerifiedBadge,
} from '@/modules/certification/certification-model';

describe('MOD-13 certification model', () => {
  test('normalizes the backend-owned price and preserves eligibility state', () => {
    expect(normalizeCertificationState({
      worker_id: 'd2000000-0000-4000-8000-000000000010', worker_approval_status: 'approved',
      certification_id: null, membership_status: null, display_state: 'eligible', price_bob: '50.00',
      starts_at: null, expires_at: null, can_request: true,
    })).toEqual(expect.objectContaining({ display_state: 'eligible', price_bob: 50, can_request: true }));
  });

  test('presents the approved offer without implying electronic payment', () => {
    expect(CERTIFICATION_PRICE_BOB).toBe(50);
    expect(CERTIFICATION_VALIDITY_MONTHS).toBe(12);
    expect(formatCertificationPrice(50)).toContain('50');
    expect(formatCertificationDate('2027-10-24T12:00:00Z')).toBeTruthy();
  });

  test('derives a visible badge only for a verified unexpired backend result', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(shouldShowVerifiedBadge({ is_verified: true, certification_expires_at: future })).toBe(true);
    expect(shouldShowVerifiedBadge({ is_verified: true, certification_expires_at: past })).toBe(false);
    expect(shouldShowVerifiedBadge({ is_verified: false, certification_expires_at: future })).toBe(false);
  });

  test('indexes batch certification results without client-side invention', () => {
    const rows = [{ worker_id: 'worker-a', is_verified: true, certification_expires_at: '2027-01-01T00:00:00Z' }];
    expect(indexPublicCertifications(rows).get('worker-a')).toEqual(rows[0]);
    expect(indexPublicCertifications(rows).has('worker-b')).toBe(false);
  });

  test('maps duplicate and eligibility failures to safe worker messages', () => {
    expect(certificationFailureMessage({ message: 'certification request already pending' })).toContain('en revisión');
    expect(certificationFailureMessage({ message: 'certification already active' })).toContain('activa');
    expect(certificationFailureMessage({ message: 'approved worker required' })).toContain('aprobado');
    expect(certificationFailureMessage(new Error('internal database detail'))).not.toContain('database');
  });
});
