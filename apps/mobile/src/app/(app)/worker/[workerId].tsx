import { useLocalSearchParams } from 'expo-router';

import { PublicWorkerProfileScreen } from '@/modules/public-worker/screens/PublicWorkerProfileScreen';

export default function PublicWorkerRoute() {
  const { workerId } = useLocalSearchParams<{ workerId?: string | string[] }>();
  return <PublicWorkerProfileScreen workerIdParam={workerId} />;
}
