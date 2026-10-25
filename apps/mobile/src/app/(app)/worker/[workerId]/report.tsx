import { useLocalSearchParams } from 'expo-router';
import { ReportSubmissionScreen } from '@/modules/report/screens/ReportSubmissionScreen';
export default function WorkerReportRoute() { const { workerId } = useLocalSearchParams<{ workerId?: string | string[] }>(); return <ReportSubmissionScreen context="profile" targetParam={workerId} />; }

