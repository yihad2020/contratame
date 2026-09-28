import { describe, expect, it } from 'vitest';

import { validateRejectionReason } from './rejection';

describe('validateRejectionReason', () => {
  it('trims and accepts a human-readable Unicode reason', () => {
    expect(validateRejectionReason('  Debe explicar mejor la reparación eléctrica.  ')).toEqual({
      ok: true,
      value: 'Debe explicar mejor la reparación eléctrica.',
    });
  });

  it('rejects blank and short reasons', () => {
    expect(validateRejectionReason('         ').ok).toBe(false);
    expect(validateRejectionReason('Muy corto').ok).toBe(false);
  });

  it('rejects reasons longer than 500 characters', () => {
    expect(validateRejectionReason('a'.repeat(501)).ok).toBe(false);
  });
});
