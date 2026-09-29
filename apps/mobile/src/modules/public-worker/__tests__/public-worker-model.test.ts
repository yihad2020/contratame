import {
  attachPortfolioSignedUrls,
  formatServiceRadius,
  normalizePublicWorkerId,
  normalizePublicWorkerProfile,
} from '@/modules/public-worker/public-worker-model';
import type { PublicWorkerProfileRpcRow } from '@/modules/public-worker/types';

const workerId = '51000000-0000-4000-8000-000000000010';

function rpcRow(): PublicWorkerProfileRpcRow {
  return {
    worker_id: workerId,
    display_name: 'Ana P.',
    professional_bio: 'Especialista en instalaciones eléctricas.',
    years_experience: 8,
    public_area_label: 'Equipetrol',
    city: 'Santa Cruz de la Sierra',
    department: 'Santa Cruz',
    service_radius_m: 12000,
    services: [{
      service_id: '52000000-0000-4000-8000-000000000010',
      category_id: '00000000-0000-4000-8000-000000000001',
      category_name: 'Electricidad',
      category_slug: 'electricidad',
      category_icon_key: 'bolt',
      title: 'Instalación eléctrica',
      description: 'Instalación residencial.',
      pricing_type: 'fixed',
      price_bob: '180.00',
    }],
    availability: [{ day_of_week: 1, start_time: '08:00', end_time: '12:00' }],
    portfolio: [{
      portfolio_item_id: '54000000-0000-4000-8000-000000000010',
      storage_path: `${workerId}/54000000-0000-4000-8000-000000000010/image.jpg`,
      title: 'Tablero terminado',
      description: null,
      sort_order: 0,
    }],
  };
}

describe('MOD-05 public worker profile model', () => {
  test('accepts only one canonical UUID route parameter', () => {
    expect(normalizePublicWorkerId(`  ${workerId.toUpperCase()}  `)).toBe(workerId);
    expect(normalizePublicWorkerId('not-a-uuid')).toBeNull();
    expect(normalizePublicWorkerId([workerId])).toBeNull();
    expect(normalizePublicWorkerId(undefined)).toBeNull();
  });

  test('normalizes RPC numerics and starts with no persisted signed URL', () => {
    const normalized = normalizePublicWorkerProfile(rpcRow());
    expect(normalized.service_radius_m).toBe(12000);
    expect(normalized.services[0].price_bob).toBe(180);
    expect(normalized.portfolio[0].signed_url).toBeNull();
  });

  test('attaches a signed URL by exact private object path', () => {
    const normalized = normalizePublicWorkerProfile(rpcRow());
    const attached = attachPortfolioSignedUrls(normalized.portfolio, [{
      path: normalized.portfolio[0].storage_path,
      signedUrl: 'https://example.invalid/signed?token=temporary',
      error: null,
    }]);
    expect(attached.hasFailures).toBe(false);
    expect(attached.portfolio[0].signed_url).toContain('token=temporary');
  });

  test('keeps portfolio metadata usable when signing fails or paths do not match', () => {
    const normalized = normalizePublicWorkerProfile(rpcRow());
    const failed = attachPortfolioSignedUrls(normalized.portfolio, [{
      path: normalized.portfolio[0].storage_path,
      signedUrl: null,
      error: 'not allowed',
    }]);
    expect(failed.hasFailures).toBe(true);
    expect(failed.portfolio[0]).toEqual(expect.objectContaining({
      title: 'Tablero terminado',
      signed_url: null,
    }));
  });

  test('formats the approved service radius without coordinates', () => {
    expect(formatServiceRadius(12000)).toBe('12 km');
    expect(formatServiceRadius(1500)).toBe('1,5 km');
  });
});
