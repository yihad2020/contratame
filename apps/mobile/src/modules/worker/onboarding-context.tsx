import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { loadWorkerDraft } from '@/modules/worker/worker-service';
import { workerFailureMessage } from '@/modules/worker/worker-errors';
import type { WorkerDraft } from '@/modules/worker/types';

type WorkerOnboardingContextValue = {
  draft: WorkerDraft | null;
  loading: boolean;
  error: string | null;
  reload(): Promise<WorkerDraft>;
};

const WorkerOnboardingContext = createContext<WorkerOnboardingContextValue | null>(null);

export function WorkerOnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<WorkerDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadWorkerDraft();
      setDraft(result);
      return result;
    } catch (cause) {
      setError(workerFailureMessage(cause, 'No se pudo cargar tu perfil profesional.', 'reload draft'));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadWorkerDraft()
      .then((result) => { if (active) setDraft(result); })
      .catch((cause) => { if (active) setError(workerFailureMessage(cause, 'No se pudo cargar tu perfil profesional.', 'load draft')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({ draft, loading, error, reload }), [draft, error, loading, reload]);
  return <WorkerOnboardingContext.Provider value={value}>{children}</WorkerOnboardingContext.Provider>;
}

export function useWorkerOnboarding() {
  const context = useContext(WorkerOnboardingContext);
  if (!context) throw new Error('useWorkerOnboarding debe usarse dentro de WorkerOnboardingProvider.');
  return context;
}
