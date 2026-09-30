import { useLocalSearchParams } from 'expo-router';

import { ServiceRequestDetailScreen } from '@/modules/service-request/screens/ServiceRequestDetailScreen';

export default function ServiceRequestDetailRoute() {
  const { requestId } = useLocalSearchParams<{ requestId?: string | string[] }>();
  return <ServiceRequestDetailScreen requestIdParam={requestId} />;
}

