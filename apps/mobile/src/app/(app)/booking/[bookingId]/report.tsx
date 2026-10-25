import { useLocalSearchParams } from 'expo-router';
import { ReportSubmissionScreen } from '@/modules/report/screens/ReportSubmissionScreen';
export default function BookingReportRoute() { const { bookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>(); return <ReportSubmissionScreen context="booking" targetParam={bookingId} />; }

