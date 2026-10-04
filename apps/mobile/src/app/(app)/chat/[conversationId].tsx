import { useLocalSearchParams } from 'expo-router';

import { ConversationScreen } from '@/modules/chat/screens/ConversationScreen';

export default function ConversationRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const routeKey = typeof conversationId === 'string' ? conversationId : 'invalid-conversation';
  return <ConversationScreen key={routeKey} conversationIdParam={conversationId} />;
}

