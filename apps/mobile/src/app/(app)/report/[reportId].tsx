import { useLocalSearchParams } from 'expo-router';
import { ReportDetailScreen } from '@/modules/report/screens/ReportDetailScreen';
export default function ReportDetailRoute() { const { reportId } = useLocalSearchParams<{ reportId?: string | string[] }>(); return <ReportDetailScreen reportIdParam={reportId} />; }

