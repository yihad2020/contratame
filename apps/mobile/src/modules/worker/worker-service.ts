import 'react-native-get-random-values';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { WorkerUserError } from '@/modules/worker/worker-errors';
import type {
  ServiceCategory,
  WorkerAvailability,
  WorkerDraft,
  WorkerLocation,
  WorkerPortfolioItem,
  WorkerProfile,
  WorkerService,
  PricingType,
} from '@/modules/worker/types';

const WORKER_COLUMNS = 'id,profile_id,bio,years_experience,approval_status,created_at,updated_at';
const SERVICE_COLUMNS = 'id,worker_id,category_id,title,description,pricing_type,price_bob,active,created_at,updated_at';
const LOCATION_COLUMNS = 'worker_id,private_location,public_location,public_area_label,city,department,country_code,service_radius_m,updated_at';
const AVAILABILITY_COLUMNS = 'id,worker_id,day_of_week,start_time,end_time,active,created_at,updated_at';
const PORTFOLIO_COLUMNS = 'id,worker_id,storage_path,title,description,sort_order,created_at,updated_at';
const PORTFOLIO_BUCKET = 'worker-portfolio';

export async function getOwnWorkerProfile(): Promise<WorkerProfile | null> {
  const { data, error } = await supabase.from('worker_profiles').select(WORKER_COLUMNS).maybeSingle();
  if (error) throw error;
  return data as WorkerProfile | null;
}

export async function startOrResumeWorkerOnboarding(): Promise<WorkerProfile> {
  const { data, error } = await supabase.rpc('start_or_resume_worker_onboarding');
  if (error) throw error;
  return data as WorkerProfile;
}

export async function loadWorkerDraft(worker?: WorkerProfile): Promise<WorkerDraft> {
  const ownWorker = worker ?? await getOwnWorkerProfile();
  if (!ownWorker) throw new WorkerUserError('Primero inicia tu perfil profesional.');
  const [categoriesResult, servicesResult, locationResult, availabilityResult, portfolioResult] = await Promise.all([
    supabase.from('service_categories').select('id,name,slug,icon_key,active,sort_order').eq('active', true).order('sort_order'),
    supabase.from('worker_services').select(SERVICE_COLUMNS).eq('worker_id', ownWorker.id).order('created_at'),
    supabase.from('worker_locations').select(LOCATION_COLUMNS).eq('worker_id', ownWorker.id).maybeSingle(),
    supabase.from('worker_availability').select(AVAILABILITY_COLUMNS).eq('worker_id', ownWorker.id).order('day_of_week').order('start_time'),
    supabase.from('worker_portfolio_items').select(PORTFOLIO_COLUMNS).eq('worker_id', ownWorker.id).order('sort_order'),
  ]);
  const firstError = [categoriesResult.error, servicesResult.error, locationResult.error, availabilityResult.error, portfolioResult.error].find(Boolean);
  if (firstError) throw firstError;
  const portfolio = await addPortfolioPreviewUrls((portfolioResult.data ?? []) as WorkerPortfolioItem[]);
  return {
    worker: ownWorker,
    categories: (categoriesResult.data ?? []) as ServiceCategory[],
    services: (servicesResult.data ?? []) as WorkerService[],
    location: parseWorkerLocation(locationResult.data as Omit<WorkerLocation, 'latitude' | 'longitude'> | null),
    availability: (availabilityResult.data ?? []) as WorkerAvailability[],
    portfolio,
  };
}

export async function saveProfessionalProfile(workerId: string, bio: string, yearsExperience: number) {
  const { error } = await supabase.from('worker_profiles').update({ bio, years_experience: yearsExperience }).eq('id', workerId);
  if (error) throw error;
}

export async function saveWorkerService(workerId: string, input: {
  categoryId: string;
  title: string;
  description: string;
  pricingType: PricingType;
  priceBob: number | null;
}, serviceId?: string) {
  const values = {
    worker_id: workerId,
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    pricing_type: input.pricingType,
    price_bob: input.priceBob,
    active: true,
  };
  const query = serviceId
    ? supabase.from('worker_services').update(values).eq('id', serviceId).eq('worker_id', workerId)
    : supabase.from('worker_services').insert(values);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteWorkerService(workerId: string, serviceId: string) {
  const { error } = await supabase.from('worker_services').delete().eq('id', serviceId).eq('worker_id', workerId);
  if (error) throw error;
}

export async function saveWorkerLocation(input: {
  workerId: string;
  latitude: number;
  longitude: number;
  areaLabel: string;
  city: string;
  department: string;
  radiusM: number;
}) {
  const { error } = await supabase.from('worker_locations').upsert({
    worker_id: input.workerId,
    private_location: `POINT(${input.longitude} ${input.latitude})`,
    public_location: null,
    public_area_label: input.areaLabel.trim(),
    city: input.city.trim(),
    department: input.department.trim(),
    country_code: 'BO',
    service_radius_m: input.radiusM,
  });
  if (error) throw error;
}

export async function saveAvailability(workerId: string, dayOfWeek: number, startTime: string, endTime: string) {
  const { error } = await supabase.from('worker_availability').insert({
    worker_id: workerId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    active: true,
  });
  if (error) throw error;
}

export async function deleteAvailability(workerId: string, rangeId: string) {
  const { error } = await supabase.from('worker_availability').delete().eq('id', rangeId).eq('worker_id', workerId);
  if (error) throw error;
}

export async function pickAndUploadPortfolioImage(input: {
  workerId: string;
  title: string;
  description: string | null;
  sortOrder: number;
}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new WorkerUserError('Permite el acceso a la galería para elegir una imagen.');
  const selection = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (selection.canceled) return false;
  const asset = selection.assets[0];
  const mimeType = asset.mimeType?.toLowerCase();
  if (!mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new WorkerUserError('Usa una imagen JPEG, PNG o WebP.');
  }
  const maxBytes = 10 * 1024 * 1024;
  const sourceBytes = asset.fileSize ?? (await (await fetch(asset.uri)).arrayBuffer()).byteLength;
  if (sourceBytes > maxBytes) throw new WorkerUserError('La imagen original no puede superar aproximadamente 10 MB.');
  const longestEdge = Math.max(asset.width, asset.height);
  const resize = longestEdge > 1600
    ? [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }]
    : [];
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const format = extension === 'png' ? ImageManipulator.SaveFormat.PNG
    : extension === 'webp' ? ImageManipulator.SaveFormat.WEBP : ImageManipulator.SaveFormat.JPEG;
  const optimized = await ImageManipulator.manipulateAsync(asset.uri, resize, { compress: 0.82, format });
  const itemId = randomUuid();
  const storagePath = `${input.workerId}/${itemId}/image.${extension}`;
  const response = await fetch(optimized.uri);
  const body = await response.arrayBuffer();
  if (body.byteLength > maxBytes) throw new WorkerUserError('La imagen optimizada supera 10 MB. Elige una imagen más pequeña.');
  const upload = await supabase.storage.from(PORTFOLIO_BUCKET).upload(storagePath, body, { contentType: mimeType, upsert: false });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from('worker_portfolio_items').insert({
    id: itemId,
    worker_id: input.workerId,
    storage_path: storagePath,
    title: input.title,
    description: input.description,
    sort_order: input.sortOrder,
  });
  if (error) {
    try {
      const cleanup = await supabase.storage.from(PORTFOLIO_BUCKET).remove([storagePath]);
      if (cleanup.error) throw cleanup.error;
    } catch (cleanupError) {
      if (__DEV__) console.warn('[MOD-02] portfolio upload cleanup failed', cleanupError);
      throw new WorkerUserError('No se guardó el trabajo y no pudimos limpiar la imagen subida. Contacta a soporte antes de volver a intentarlo.');
    }
    throw error;
  }
  return true;
}

export async function deletePortfolioItem(workerId: string, item: WorkerPortfolioItem) {
  const { error } = await supabase.from('worker_portfolio_items').delete().eq('id', item.id).eq('worker_id', workerId);
  if (error) throw error;
  try {
    const storage = await supabase.storage.from(PORTFOLIO_BUCKET).remove([item.storage_path]);
    if (storage.error) throw storage.error;
  } catch (cleanupError) {
    if (__DEV__) console.warn('[MOD-02] portfolio delete cleanup failed', cleanupError);
    throw new WorkerUserError('El trabajo se eliminó, pero no pudimos limpiar su imagen. Contacta a soporte.');
  }
}

export async function submitWorkerProfileForApproval() {
  const { data, error } = await supabase.rpc('submit_worker_profile_for_approval');
  if (error) throw error;
  return data as string;
}

function parseWorkerLocation(row: Omit<WorkerLocation, 'latitude' | 'longitude'> | null): WorkerLocation | null {
  if (!row) return null;
  const point = row.private_location as { coordinates?: unknown } | null;
  const coordinates = point && Array.isArray(point.coordinates) ? point.coordinates : null;
  return {
    ...row,
    longitude: coordinates && typeof coordinates[0] === 'number' ? coordinates[0] : null,
    latitude: coordinates && typeof coordinates[1] === 'number' ? coordinates[1] : null,
  };
}

async function addPortfolioPreviewUrls(items: WorkerPortfolioItem[]) {
  return Promise.all(items.map(async (item) => {
    const { data, error } = await supabase.storage.from(PORTFOLIO_BUCKET).createSignedUrl(item.storage_path, 600);
    if (error) throw error;
    return { ...item, preview_url: data?.signedUrl };
  }));
}

function randomUuid() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
