import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { FormField } from '@/components/ui/FormField';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
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
              {item.preview_url ? <Image accessibilityLabel={`Trabajo ${item.title}`} source={{ uri: item.preview_url }} style={styles.image} /> : <View style={styles.imageFallback}><AppIcon name="image" color={colors.textSecondary} /></View>}
              <View style={styles.itemRow}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                </View>
                <Pressable accessibilityLabel={`Eliminar ${item.title}`} disabled={saving} onPress={() => remove(item)} style={styles.iconButton}><AppIcon name="trash" size={sizing.iconSm} color={colors.danger} /></Pressable>
              </View>
            </WorkerSurface>
          ))}
        </View>
      ) : <Text style={styles.empty}>No agregaste trabajos. Puedes continuar sin portafolio.</Text>}

      <WorkerSurface title={`Agregar trabajo · ${currentDraft.portfolio.length}/12`}>
        <FormField label="Título" value={title} onChangeText={setTitle} error={errors.title} maxLength={80} placeholder="Ej. Renovación de cocina" />
        <FormField label="Descripción (opcional)" multiline value={description} onChangeText={setDescription} error={errors.description} maxLength={300} placeholder="Explica brevemente qué realizaste." />
        {errors.count ? <Text style={styles.error}>{errors.count}</Text> : null}
        <AppButton label="Elegir imagen de la galería" icon="image" loading={saving} disabled={currentDraft.portfolio.length >= 12} onPress={() => void add()} />
        <Text style={styles.help}>JPEG, PNG o WebP; original de hasta aproximadamente 10 MB. Las imágenes grandes se optimizan antes de subir.</Text>
      </WorkerSurface>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  imageFallback: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, gap: spacing.xs },
  itemTitle: { color: colors.text, ...typography.bodyStrong },
  description: { color: colors.textSecondary, ...typography.caption },
  iconButton: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  empty: { color: colors.textSecondary, ...typography.body },
  error: { color: colors.danger, ...typography.caption },
  help: { color: colors.textSecondary, ...typography.caption },
});
