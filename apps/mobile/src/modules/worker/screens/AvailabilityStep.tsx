import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppIcon } from '@/components/ui/AppIcon';
import { FormField } from '@/components/ui/FormField';
import { ErrorMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { InlineChoice } from '@/modules/worker/components/InlineChoice';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { WorkerSurface } from '@/modules/worker/components/WorkerSurface';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { weekdayLabels, type WorkerAvailability } from '@/modules/worker/types';
import { validateAvailabilityRange } from '@/modules/worker/validation';
import { deleteAvailability, saveAvailability } from '@/modules/worker/worker-service';

export function AvailabilityStep() {
  const { draft, reload } = useWorkerOnboarding();
  const [day, setDay] = useState(1);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('12:00');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  if (!draft) return null;
  const currentDraft = draft;

  async function addRange() {
    if (savingRef.current) return;
    const checked = validateAvailabilityRange(day, start, end, currentDraft.availability);
    if (!checked.ok) { setErrors(checked.errors); return; }
    savingRef.current = true; setSaving(true); setErrors({}); setFailure(null);
    try {
      await saveAvailability(currentDraft.worker.id, checked.value.dayOfWeek, checked.value.startTime, checked.value.endTime);
      await reload();
    } catch (cause) { setFailure(workerFailureMessage(cause, 'No se pudo guardar el horario.', 'save availability')); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function remove(range: WorkerAvailability) {
    if (savingRef.current) return;
    Alert.alert('Eliminar horario', `${weekdayLabels[range.day_of_week]} ${range.start_time.slice(0, 5)}–${range.end_time.slice(0, 5)}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeConfirmed(range) },
    ]);
  }

  async function removeConfirmed(range: WorkerAvailability) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setFailure(null);
    try {
      await deleteAvailability(currentDraft.worker.id, range.id);
      await reload();
    } catch (cause) { setFailure(workerFailureMessage(cause, 'No se pudo eliminar el horario.', 'delete availability')); }
    finally { savingRef.current = false; setSaving(false); }
  }

  const byDay = currentDraft.availability.reduce<Record<number, WorkerAvailability[]>>((groups, range) => {
    (groups[range.day_of_week] ??= []).push(range); return groups;
  }, {});
  return (
    <OnboardingScaffold
      step={4}
      title="Disponibilidad"
      description="Indica horarios semanales generales. Esto no crea reservas automáticas y se interpreta en hora de Bolivia."
      onNext={() => currentDraft.availability.some((range) => range.active) ? router.push('/(app)/worker-onboarding/step/5' as never) : setFailure('Agrega al menos un horario antes de continuar.')}
      nextDisabled={saving}
    >
      {currentDraft.availability.length ? (
        <View style={styles.schedule}>
          {Object.entries(byDay).sort(([first], [second]) => Number(first) - Number(second)).map(([dayKey, ranges]) => (
            <WorkerSurface key={dayKey} title={weekdayLabels[Number(dayKey)]}>
              {ranges.map((range) => (
                <View key={range.id} style={styles.rangeRow}>
                  <AppIcon name="time" size={sizing.iconSm} color={colors.textSecondary} />
                  <Text style={styles.range}>{range.start_time.slice(0, 5)}–{range.end_time.slice(0, 5)}</Text>
                  <Pressable accessibilityLabel="Eliminar horario" disabled={saving} onPress={() => remove(range)} style={styles.iconButton}><AppIcon name="trash" size={sizing.iconSm} color={colors.danger} /></Pressable>
                </View>
              ))}
            </WorkerSurface>
          ))}
        </View>
      ) : <Text style={styles.empty}>Todavía no agregaste disponibilidad.</Text>}

      <WorkerSurface title="Agregar horario">
        <Text style={styles.label}>Día</Text>
        <InlineChoice<number> options={weekdayLabels.map((label, value) => ({ label, value }))} value={day} onChange={setDay} />
        <View style={styles.timeRow}>
          <View style={styles.timeField}><FormField label="Desde" value={start} onChangeText={setStart} error={errors.start} placeholder="08:00" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
          <View style={styles.timeField}><FormField label="Hasta" value={end} onChangeText={setEnd} error={errors.end} placeholder="12:00" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <Text style={styles.help}>Usa HH:00 o HH:30. Puedes agregar varios rangos por día sin superponerlos.</Text>
        <AppButton label="Agregar horario" icon="plus" loading={saving} onPress={() => void addRange()} />
      </WorkerSurface>
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  schedule: { gap: spacing.sm },
  rangeRow: { minHeight: sizing.touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  range: { flex: 1, color: colors.text, ...typography.body },
  iconButton: { width: sizing.touchTarget, height: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  empty: { color: colors.textSecondary, ...typography.body },
  label: { color: colors.text, ...typography.label },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1 },
  help: { color: colors.textSecondary, ...typography.caption },
});
