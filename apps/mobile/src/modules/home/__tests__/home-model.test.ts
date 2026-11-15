import {
  buildExploreSearchParams,
  getCategoryIcon,
  getGreeting,
  getInitials,
  getWorkerPanel,
  toGridRows,
} from '@/modules/home/home-model';
import { marketplaceDraftFromRouteParams } from '@/modules/marketplace/validation';

const idle = { loading: false, starting: false, loadError: null };

describe('home-model', () => {
  it('builds initials and greeting defensively', () => {
    expect(getInitials('Yihad', 'Salek')).toBe('YS');
    expect(getInitials(' ana ', null)).toBe('A');
    expect(getInitials(null, undefined)).toBe('C');
    expect(getGreeting('Yihad')).toBe('Hola, Yihad');
    expect(getGreeting('  ')).toBe('Hola');
  });

  it('maps known category icon keys and falls back for unknown ones', () => {
    expect(getCategoryIcon('bolt')).toBe('bolt');
    expect(getCategoryIcon('mechanic')).toBe('mechanic');
    expect(getCategoryIcon('unknown')).toBe('category');
    expect(getCategoryIcon(null)).toBe('category');
  });

  it('splits items into padded grid rows', () => {
    expect(toGridRows([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5, null, null, null]]);
    expect(toGridRows([], 4)).toEqual([]);
    expect(toGridRows([1], 0)).toEqual([]);
  });

  it('shows a single retry action when the worker status fails to load', () => {
    const panel = getWorkerPanel({ ...idle, status: null, loadError: 'Sin conexión.' });
    expect(panel.tone).toBe('error');
    expect(panel.description).toBe('Sin conexión.');
    expect(panel.action).toEqual({ kind: 'retry', label: 'Reintentar' });
  });

  it('prioritises starting and loading over other states', () => {
    expect(getWorkerPanel({ ...idle, status: 'approved', starting: true }).tone).toBe('loading');
    expect(getWorkerPanel({ ...idle, status: null, loading: true, loadError: 'x' }).action).toBeNull();
  });

  it('maps every approval status to an open action', () => {
    expect(getWorkerPanel({ ...idle, status: null }).action?.label).toBe('Crear perfil profesional');
    expect(getWorkerPanel({ ...idle, status: 'draft' }).tone).toBe('progress');
    expect(getWorkerPanel({ ...idle, status: 'pending_approval' }).title).toBe('Perfil profesional en revisión');
    expect(getWorkerPanel({ ...idle, status: 'approved' }).tone).toBe('success');
    expect(getWorkerPanel({ ...idle, status: 'rejected' }).tone).toBe('attention');
    expect(getWorkerPanel({ ...idle, status: 'suspended' }).action?.kind).toBe('open');
  });

  it('only forwards non-empty search queries to Explore', () => {
    expect(buildExploreSearchParams('  electricista ')).toEqual({ q: 'electricista' });
    expect(buildExploreSearchParams('   ')).toBeNull();
  });
});

describe('marketplaceDraftFromRouteParams', () => {
  it('accepts a query and a UUID category', () => {
    const draft = marketplaceDraftFromRouteParams({ q: ' plomero ', categoryId: '00000000-0000-4000-8000-000000000002' });
    expect(draft.query).toBe('plomero');
    expect(draft.categoryId).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('ignores malformed categories, uses the first array value and caps the query', () => {
    const draft = marketplaceDraftFromRouteParams({ q: ['a'.repeat(150), 'b'], categoryId: 'electricidad' });
    expect(draft.query).toHaveLength(100);
    expect(draft.categoryId).toBe('');
    expect(marketplaceDraftFromRouteParams({}).query).toBe('');
  });
});
