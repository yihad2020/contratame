import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { normalizeRealtimeMessage } from '@/modules/chat/chat-model';
import type { ChatConnectionState, ChatMessage, RealtimeMessageRow } from '@/modules/chat/types';

let channelSequence = 0;

function mapRealtimeStatus(status: `${REALTIME_SUBSCRIBE_STATES}`): ChatConnectionState {
  if (status === 'SUBSCRIBED') return 'connected';
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') return 'error';
  if (status === 'CLOSED') return 'reconnecting';
  return 'connecting';
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onStatus: (status: ChatConnectionState) => void,
) {
  channelSequence += 1;
  const channel = supabase
    .channel(`conversation:${conversationId}:${channelSequence}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = normalizeRealtimeMessage(payload.new as RealtimeMessageRow);
        if (message) onMessage(message);
      },
    )
    .subscribe((status) => onStatus(mapRealtimeStatus(status)));

  return () => {
    void supabase.removeChannel(channel);
  };
}

