import { useLocalSearchParams } from 'expo-router';

import { BookingDetailScreen } from '@/modules/booking/screens/BookingDetailScreen';

export default function BookingDetailRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  return <BookingDetailScreen bookingIdParam={bookingId} />;
}
