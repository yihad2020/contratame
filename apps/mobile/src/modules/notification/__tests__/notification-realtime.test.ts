import { supabase } from '@/lib/supabase';
import { subscribeToOwnNotifications } from '@/modules/notification/notification-realtime';

jest.mock('@/lib/supabase', () => ({
  supabase: { channel: jest.fn(), removeChannel: jest.fn() },
}));

const mockOn = jest.fn();
const mockSubscribe = jest.fn();
const mockChannel = supabase.channel as jest.Mock;
const mockRemoveChannel = supabase.removeChannel as jest.Mock;
const mockRealtimeChannel = { on: mockOn, subscribe: mockSubscribe };

describe('MOD-11 notification realtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockReturnValue(mockRealtimeChannel);
    mockSubscribe.mockReturnValue(mockRealtimeChannel);
    mockChannel.mockReturnValue(mockRealtimeChannel);
  });

  test('subscribes only to own INSERT and UPDATE events', () => {
    const profileId = 'a0000000-0000-4000-8000-000000000001';
    const onChange = jest.fn();
    subscribeToOwnNotifications(profileId, onChange, jest.fn());

    expect(mockOn).toHaveBeenNthCalledWith(1, 'postgres_changes', expect.objectContaining({
      event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}`,
    }), onChange);
    expect(mockOn).toHaveBeenNthCalledWith(2, 'postgres_changes', expect.objectContaining({
      event: 'UPDATE', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}`,
    }), onChange);
  });

  test('maps subscription and reconnect states so the screen can reconcile by RPC', () => {
    const onStatus = jest.fn();
    subscribeToOwnNotifications('a0000000-0000-4000-8000-000000000001', jest.fn(), onStatus);
    const callback = mockSubscribe.mock.calls[0][0];

    callback('SUBSCRIBED');
    callback('CLOSED');
    callback('CHANNEL_ERROR');
    callback('TIMED_OUT');

    expect(onStatus.mock.calls.map(([status]) => status)).toEqual([
      'connected', 'reconnecting', 'error', 'error',
    ]);
  });

  test('removes the exact channel during cleanup', () => {
    const unsubscribe = subscribeToOwnNotifications(
      'a0000000-0000-4000-8000-000000000001', jest.fn(), jest.fn(),
    );

    unsubscribe();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockRealtimeChannel);
  });
});
