import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { FormField } from '@/components/ui/FormField';
import { ErrorMessage } from '@/components/ui/Typography';
import { OnboardingScaffold } from '@/modules/worker/components/OnboardingScaffold';
import { useWorkerOnboarding } from '@/modules/worker/onboarding-context';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import { validateProfessionalProfile } from '@/modules/worker/validation';
import { saveProfessionalProfile } from '@/modules/worker/worker-service';

export function ProfessionalStep() {
  const { draft, reload } = useWorkerOnboarding();
  const [bio, setBio] = useState(draft?.worker.bio ?? '');
  const [years, setYears] = useState(draft?.worker.years_experience?.toString() ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function save() {
    if (!draft || savingRef.current) return;
    const checked = validateProfessionalProfile(bio, years);
    if (!checked.ok) { setErrors(checked.errors); return; }
    savingRef.current = true; setSaving(true); setFailure(null); setErrors({});
    try {
      await saveProfessionalProfile(draft.worker.id, checked.value.bio, checked.value.yearsExperience);
      await reload();
      router.push('/(app)/worker-onboarding/step/2' as never);
    } catch (cause) {
      setFailure(workerFailureMessage(cause, 'No se pudo guardar el perfil profesional.', 'save professional profile'));
    } finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <OnboardingScaffold
      step={1}
      title="Perfil profesional"
      description="Cuéntales a futuros clientes qué sabes hacer y cuánta experiencia tienes. Tus datos personales ya están en tu cuenta."
      onNext={() => void save()}
      nextLoading={saving}
    >
      <FormField
        label="Biografía profesional"
        multiline
        numberOfLines={6}
        maxLength={600}
        value={bio}
        onChangeText={setBio}
        error={errors.bio}
        helperText={`${Array.from(bio.trim()).length}/600 · mínimo 40 caracteres`}
        placeholder="Describe tu experiencia, la forma en que trabajas y el tipo de ayuda que ofreces."
      />
      <FormField
        label="Años de experiencia"
        keyboardType="number-pad"
        maxLength={2}
        value={years}
        onChangeText={setYears}
        error={errors.years}
        helperText="Puedes indicar 0 si estás comenzando."
        placeholder="0"
      />
      {failure ? <ErrorMessage>{failure}</ErrorMessage> : null}
    </OnboardingScaffold>
  );
}
