import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { NotificationConnectionState } from '@/modules/notification/types';

let notificationChannelSequence = 0;

function mapRealtimeStatus(status: `${REALTIME_SUBSCRIBE_STATES}`): NotificationConnectionState {
  if (status === 'SUBSCRIBED') return 'connected';
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') return 'error';
  if (status === 'CLOSED') return 'reconnecting';
  return 'connecting';
}

export function subscribeToOwnNotifications(
  profileId: string,
  onChange: () => void,
  onStatus: (state: NotificationConnectionState) => void,
) {
  notificationChannelSequence += 1;
  const channel = supabase
    .channel(`notifications:${profileId}:${notificationChannelSequence}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `profile_id=eq.${profileId}`,
    }, onChange)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `profile_id=eq.${profileId}`,
    }, onChange)
    .subscribe((status) => onStatus(mapRealtimeStatus(status)));

  return () => { void supabase.removeChannel(channel); };
}
