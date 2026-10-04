import { useLocalSearchParams } from 'expo-router';

import { ConversationScreen } from '@/modules/chat/screens/ConversationScreen';

export default function RequestConversationRoute() {
  const { requestId } = useLocalSearchParams<{ requestId?: string | string[] }>();
  const routeKey = typeof requestId === 'string' ? requestId : 'invalid-request';
  return <ConversationScreen key={routeKey} requestIdParam={requestId} />;
}

