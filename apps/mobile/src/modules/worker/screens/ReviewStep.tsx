import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconBubble, StatusPill } from '@/components/ui/Kit';
import { ErrorMessage, FeedbackMessage } from '@/components/ui/Typography';
import { shadows, ui, uiRadii } from '@/constants/theme';
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
            {section.complete
              ? <View style={styles.completeIcon}><Icon name="check-circle" color={ui.greenText} size={24} /></View>
              : <IconBubble name="alert-circle" variant="soft" size={44} iconSize={24} />}
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{section.title}</Text>
                {section.optional ? <StatusPill label="Opcional" tone="neutral" /> : null}
              </View>
              <Text style={styles.detail}>{section.detail}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={ui.accent} />
          </Pressable>
        ))}
      </View>
      {!canSubmit ? <FeedbackMessage tone="info">Las secciones pendientes muestran exactamente qué falta. Toca cualquiera para corregirla.</FeedbackMessage> : <FeedbackMessage>Tu perfil cumple los requisitos visibles. La base de datos volverá a validarlo todo al enviar.</FeedbackMessage>}
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 12 },
  section: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: ui.card, borderRadius: uiRadii.xl, ...shadows.card },
  pressed: { opacity: 0.8 },
  completeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.greenSoft },
  copy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: ui.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  detail: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
