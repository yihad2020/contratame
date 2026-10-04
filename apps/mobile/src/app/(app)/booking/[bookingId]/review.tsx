import { useLocalSearchParams } from 'expo-router';

import { BookingReviewScreen } from '@/modules/review/screens/BookingReviewScreen';

export default function BookingReviewRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  return <BookingReviewScreen bookingIdParam={bookingId} />;
}
