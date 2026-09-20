import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { canSubmitWorkerDraft, getCompletionSections } from '@/modules/worker/validation';
import { getOwnWorkerProfile, submitWorkerProfileForApproval } from '@/modules/worker/worker-service';

export function ReviewStep() {
  const { draft, reload } = useWorkerOnboarding();
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  if (!draft) return null;
  const sections = getCompletionSections(draft);
  const canSubmit = canSubmitWorkerDraft(draft);

  async function submit() {
    if (submittingRef.current) return;
    if (!canSubmit) { setFailure('Completa las secciones obligatorias indicadas antes de enviar.'); return; }
    submittingRef.current = true; setSubmitting(true); setFailure(null);
    try {
      await submitWorkerProfileForApproval();
      await reload();
      router.replace('/(app)/worker-onboarding/status' as never);
    } catch (cause) {
      const message = workerFailureMessage(cause, 'No se pudo enviar el perfil. Revisa los datos e inténtalo de nuevo.', 'submit worker');
      try {
        const current = await getOwnWorkerProfile();
        if (current?.approval_status === 'pending_approval') {
          try { await reload(); } catch { /* The route displays the provider's retryable error. */ }
          router.replace('/(app)/worker-onboarding/status' as never);
          return;
        }
      } catch (verificationError) {
        workerFailureMessage(verificationError, '', 'verify submission status');
      }
      setFailure(message);
    } finally { submittingRef.current = false; setSubmitting(false); }
  }

  return (
    <OnboardingScaffold
      step={6}
      title="Revisar y enviar"
      description="Revisa cada sección. Al enviar, tu información profesional quedará en solo lectura mientras un administrador la evalúa."
      onNext={() => void submit()}
      nextLabel="Enviar a revisión"
      nextLoading={submitting}
    >
      <View style={styles.sections}>
        {sections.map((section) => (
          <Pressable
            accessibilityRole="button"
            key={section.key}
            onPress={() => router.push(`/(app)/worker-onboarding/step/${section.step}` as never)}
            style={({ pressed }) => [styles.section, pressed && styles.pressed]}
          >
            <View style={[styles.icon, section.complete ? styles.completeIcon : styles.incompleteIcon]}>
              <AppIcon name={section.complete ? 'check' : 'error'} size={sizing.iconSm} color={section.complete ? colors.success : colors.warning} />
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{section.title}</Text>
                {section.optional ? <Text style={styles.optional}>Opcional</Text> : null}
              </View>
              <Text style={styles.detail}>{section.detail}</Text>
            </View>
            <AppIcon name="chevronRight" size={sizing.iconSm} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
      {!canSubmit ? <FeedbackMessage tone="info">Las secciones pendientes muestran exactamente qué falta. Toca cualquiera para corregirla.</FeedbackMessage> : <FeedbackMessage>Tu perfil cumple los requisitos visibles. La base de datos volverá a validarlo todo al enviar.</FeedbackMessage>}
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.sm },
  section: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg },
  pressed: { backgroundColor: colors.surfaceMuted },
  icon: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  completeIcon: { backgroundColor: colors.successSoft },
  incompleteIcon: { backgroundColor: colors.warningSoft },
  copy: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: colors.text, ...typography.bodyStrong },
  optional: { color: colors.textSecondary, ...typography.caption },
  detail: { color: colors.textSecondary, ...typography.caption },
});
