import { describe, expect, test } from 'vitest';
import {
  canDecideCertification,
  certificationDecisionMessage,
  certificationStatusLabels,
  formatCertificationPrice,
  isCertificationStatus,
} from './certification';

describe('MOD-13 certification administration model', () => {
  test('labels only the frozen certification states', () => {
    expect(certificationStatusLabels.pending_payment).toContain('Pendiente');
    expect(certificationStatusLabels.active).toBe('Activa');
    expect(certificationStatusLabels.expired).toBe('Vencida');
    expect(certificationStatusLabels.cancelled).toBe('Rechazada');
    expect(isCertificationStatus('rejected')).toBe(false);
  });

  test('allows decisions only for pending requests', () => {
    expect(canDecideCertification('pending_payment')).toBe(true);
    expect(canDecideCertification('active')).toBe(false);
    expect(canDecideCertification('expired')).toBe(false);
    expect(canDecideCertification('cancelled')).toBe(false);
  });

  test('presents the fixed business price safely', () => {
    expect(formatCertificationPrice('50.00')).toContain('50');
    expect(formatCertificationPrice('invalid')).toBe('—');
  });

  test('maps stale, eligibility and authorization failures without leaking internals', () => {
    expect(certificationDecisionMessage('certification request was already reviewed')).toContain('procesada');
    expect(certificationDecisionMessage('worker is no longer eligible')).toContain('requisitos');
    expect(certificationDecisionMessage('administrator access required')).toContain('autorización');
    expect(certificationDecisionMessage('SQL internal')).not.toContain('SQL');
  });
});

