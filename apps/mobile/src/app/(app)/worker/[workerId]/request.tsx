import { useLocalSearchParams } from 'expo-router';

import { RequestServiceScreen } from '@/modules/service-request/screens/RequestServiceScreen';

export default function RequestServiceRoute() {
  const { workerId } = useLocalSearchParams<{ workerId?: string | string[] }>();
  return <RequestServiceScreen workerIdParam={workerId} />;
}

