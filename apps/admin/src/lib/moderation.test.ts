import { describe, expect, test } from 'vitest';
import { canModerateReport, normalizeModerationNotes, validateModerationNotes } from './moderation';

describe('MOD-12 moderation model', () => {
  test('normalizes notes and counts Unicode code points', () => {
    expect(normalizeModerationNotes('  caso\n revisado   por seguridad ')).toBe('caso revisado por seguridad');
    expect(validateModerationNotes('😀'.repeat(10)).ok).toBe(true);
  });
  test('enforces note limits', () => {
    expect(validateModerationNotes('corto').ok).toBe(false);
    expect(validateModerationNotes('a'.repeat(1001)).ok).toBe(false);
  });
  test('allows only the approved transition graph', () => {
    expect(canModerateReport('open', 'under_review')).toBe(true);
    expect(canModerateReport('under_review', 'resolved')).toBe(true);
    expect(canModerateReport('resolved', 'open')).toBe(false);
    expect(canModerateReport('dismissed', 'resolved')).toBe(false);
  });
});

