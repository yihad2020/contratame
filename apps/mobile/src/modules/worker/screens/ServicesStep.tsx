import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/ui/FormField';
import { categoryGlyph } from '@/components/ui/Icon';
import { IconBubble } from '@/components/ui/Kit';
import { PillButton } from '@/components/ui/PillButton';
import { ErrorMessage } from '@/components/ui/Typography';
import { ui } from '@/constants/theme';
import { IconAction } from '@/modules/worker/components/IconAction';
import { InlineChoice } from '@/modules/worker/components/InlineChoice';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { WorkerSurface } from '@/modules/worker/components/WorkerSurface';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { pricingLabels, type PricingType, type WorkerService } from '@/modules/worker/types';
import { validateService } from '@/modules/worker/validation';
import { deleteWorkerService, saveWorkerService } from '@/modules/worker/worker-service';

const emptyForm = { categoryId: '', title: '', description: '', pricingType: 'quote' as PricingType, priceText: '' };

export function ServicesStep() {
  const { draft, reload } = useWorkerOnboarding();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  if (!draft) return null;
  const currentDraft = draft;

  function edit(service: WorkerService) {
    if (savingRef.current) return;
    setEditingId(service.id);
    setForm({
      categoryId: service.category_id,
      title: service.title,
      description: service.description ?? '',
      pricingType: service.pricing_type,
      priceText: service.price_bob === null ? '' : String(service.price_bob),
    });
    setErrors({});
  }

  async function save() {
    if (savingRef.current) return;
    const checked = validateService(form);
    if (!checked.ok) { setErrors(checked.errors); return; }
    savingRef.current = true; setSaving(true); setFailure(null); setErrors({});
    try {
      await saveWorkerService(currentDraft.worker.id, checked.value, editingId);
      setForm(emptyForm); setEditingId(undefined);
      await reload();
    } catch (cause) {
      setFailure(workerFailureMessage(cause, 'No se pudo guardar el servicio.', 'save service'));
    } finally { savingRef.current = false; setSaving(false); }
  }

  function remove(service: WorkerService) {
    if (savingRef.current) return;
    Alert.alert('Eliminar servicio', `¿Eliminar “${service.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeConfirmed(service) },
    ]);
  }

  async function removeConfirmed(service: WorkerService) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setFailure(null);
    try {
      await deleteWorkerService(currentDraft.worker.id, service.id);
      await reload();
    } catch (cause) {
      setFailure(workerFailureMessage(cause, 'No se pudo eliminar el servicio.', 'delete service'));
    } finally { savingRef.current = false; setSaving(false); }
  }

  const categoryOptions = currentDraft.categories.map((category) => ({ label: category.name, value: category.id }));
  const categoryName = (id: string) => currentDraft.categories.find((category) => category.id === id)?.name ?? 'Categoría';
  const categoryIcon = (id: string) => {
    const category = currentDraft.categories.find((item) => item.id === id);
    return categoryGlyph(category?.icon_key, category?.slug).name;
  };
  return (
    <OnboardingScaffold
      step={2}
      title="Servicios y precios"
      description="Agrega cada servicio que ofreces. Las categorías son administradas por Contrátame! y puedes usar más de una."
      onNext={() => currentDraft.services.some((service) => service.active) ? router.push('/(app)/worker-onboarding/step/3' as never) : setFailure('Agrega al menos un servicio activo antes de continuar.')}
      nextDisabled={saving}
    >
      {currentDraft.services.length ? (
        <View style={styles.list}>
          {currentDraft.services.map((service) => (
            <WorkerSurface key={service.id}>
              <View style={styles.serviceRow}>
                <IconBubble name={categoryIcon(service.category_id)} variant="soft" shape="square" size={48} iconSize={26} />
                <View style={styles.serviceCopy}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.meta}>{categoryName(service.category_id)} · {pricingLabels[service.pricing_type]}{service.price_bob === null ? '' : ` · Bs ${service.price_bob}`}</Text>
                </View>
                <IconAction label={`Editar ${service.title}`} icon="pencil" disabled={saving} onPress={() => edit(service)} />
                <IconAction label={`Eliminar ${service.title}`} icon="delete" tone="danger" disabled={saving} onPress={() => remove(service)} />
              </View>
            </WorkerSurface>
          ))}
        </View>
      ) : <Text style={styles.empty}>Aún no agregaste servicios. Crea el primero aquí.</Text>}

      <WorkerSurface title={editingId ? 'Editar servicio' : 'Nuevo servicio'}>
        <Text style={styles.fieldLabel}>Categoría</Text>
        <InlineChoice options={categoryOptions} value={form.categoryId} onChange={(categoryId) => setForm((current) => ({ ...current, categoryId }))} />
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
        <FormField label="Título" maxLength={80} value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} error={errors.title} placeholder="Ej. Instalación de tomacorrientes" />
        <FormField label="Descripción" multiline maxLength={500} value={form.description} onChangeText={(description) => setForm((current) => ({ ...current, description }))} error={errors.description} placeholder="Explica qué incluye este servicio." />
        <Text style={styles.fieldLabel}>Forma de cobro</Text>
        <InlineChoice
          options={(Object.keys(pricingLabels) as PricingType[]).map((value) => ({ value, label: pricingLabels[value] }))}
          value={form.pricingType}
          onChange={(pricingType) => setForm((current) => ({ ...current, pricingType, priceText: pricingType === 'quote' ? '' : current.priceText }))}
        />
        {form.pricingType !== 'quote' ? <FormField label="Precio en BOB" keyboardType="decimal-pad" value={form.priceText} onChangeText={(priceText) => setForm((current) => ({ ...current, priceText }))} error={errors.price} placeholder="150.00" /> : <Text style={styles.quoteNote}>El precio se acordará mediante una cotización. No se guardará Bs 0.</Text>}
        <PillButton label={editingId ? 'Guardar cambios' : 'Agregar servicio'} icon="plus" loading={saving} onPress={() => void save()} />
        {editingId ? <PillButton label="Cancelar edición" variant="outline" onPress={() => { setEditingId(undefined); setForm(emptyForm); setErrors({}); }} /> : null}
      </WorkerSurface>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceCopy: { flex: 1, gap: 2 },
  serviceTitle: { color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  meta: { color: ui.muted, fontSize: 13, lineHeight: 18 },
  empty: { color: ui.muted, fontSize: 15, lineHeight: 21 },
  fieldLabel: { color: ui.ink, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18 },
  quoteNote: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
