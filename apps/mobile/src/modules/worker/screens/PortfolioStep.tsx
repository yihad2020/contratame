import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/ui/FormField';
import { Icon } from '@/components/ui/Icon';
import { PillButton } from '@/components/ui/PillButton';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui, uiRadii } from '@/constants/theme';
import { IconAction } from '@/modules/worker/components/IconAction';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { WorkerSurface } from '@/modules/worker/components/WorkerSurface';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import type { WorkerPortfolioItem } from '@/modules/worker/types';
import { validatePortfolioMetadata } from '@/modules/worker/validation';
import { deletePortfolioItem, pickAndUploadPortfolioImage } from '@/modules/worker/worker-service';

export function PortfolioStep() {
  const { draft, reload } = useWorkerOnboarding();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  if (!draft) return null;
  const currentDraft = draft;

  async function add() {
    if (savingRef.current) return;
    const checked = validatePortfolioMetadata(title, description, currentDraft.portfolio.length);
    if (!checked.ok) { setErrors(checked.errors); return; }
    savingRef.current = true; setSaving(true); setFailure(null); setErrors({});
    try {
      const added = await pickAndUploadPortfolioImage({
        workerId: currentDraft.worker.id,
        title: checked.value.title,
        description: checked.value.description,
        sortOrder: currentDraft.portfolio.length,
      });
      if (added) { setTitle(''); setDescription(''); await reload(); }
    } catch (cause) { setFailure(workerFailureMessage(cause, 'No se pudo agregar la imagen.', 'upload portfolio image')); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function remove(item: WorkerPortfolioItem) {
    if (savingRef.current) return;
    Alert.alert('Eliminar trabajo', `¿Eliminar “${item.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeConfirmed(item) },
    ]);
  }

  async function removeConfirmed(item: WorkerPortfolioItem) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setFailure(null);
    try {
      await deletePortfolioItem(currentDraft.worker.id, item);
      await reload();
    } catch (cause) { setFailure(workerFailureMessage(cause, 'No se pudo eliminar el trabajo.', 'delete portfolio item')); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <OnboardingScaffold step={5} title="Portafolio" description="Muestra ejemplos reales de tu trabajo. Esta sección es opcional y permanece privada hasta que tu perfil sea aprobado." onNext={() => router.push('/(app)/worker-onboarding/step/6' as never)} nextLabel="Revisar mi perfil" nextDisabled={saving}>
      {currentDraft.portfolio.length ? (
        <View style={styles.grid}>
          {currentDraft.portfolio.map((item) => (
            <WorkerSurface key={item.id}>
              {item.preview_url ? <Image accessibilityLabel={`Trabajo ${item.title}`} source={{ uri: item.preview_url }} style={styles.image} /> : <View style={styles.imageFallback}><Icon name="image" color={ui.subtle} size={40} /></View>}
              <View style={styles.itemRow}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                </View>
                <IconAction label={`Eliminar ${item.title}`} icon="delete" tone="danger" disabled={saving} onPress={() => remove(item)} />
              </View>
            </WorkerSurface>
          ))}
        </View>
      ) : <Text style={styles.empty}>No agregaste trabajos. Puedes continuar sin portafolio.</Text>}

      <WorkerSurface title={`Agregar trabajo · ${currentDraft.portfolio.length}/12`}>
        <FormField label="Título" value={title} onChangeText={setTitle} error={errors.title} maxLength={80} placeholder="Ej. Renovación de cocina" />
        <FormField label="Descripción (opcional)" multiline value={description} onChangeText={setDescription} error={errors.description} maxLength={300} placeholder="Explica brevemente qué realizaste." />
        {errors.count ? <Text style={styles.error}>{errors.count}</Text> : null}
        <PillButton label="Elegir imagen de la galería" icon="image" loading={saving} disabled={currentDraft.portfolio.length >= 12} onPress={() => void add()} />
        <Text style={styles.help}>JPEG, PNG o WebP; original de hasta aproximadamente 10 MB. Las imágenes grandes se optimizan antes de subir.</Text>
      </WorkerSurface>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: uiRadii.lg, backgroundColor: ui.tag },
  imageFallback: { width: '100%', aspectRatio: 16 / 10, borderRadius: uiRadii.lg, backgroundColor: ui.tag, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, gap: 2 },
  itemTitle: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  description: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  empty: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18 },
  help: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
