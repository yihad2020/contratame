import { Redirect, Stack } from 'expo-router'; import { useAuth } from '@/modules/auth/auth-context';
export default function ProtectedLayout() { const { state } = useAuth(); if (state !== 'active') return <Redirect href="/" />; return <Stack screenOptions={{ headerStyle: { backgroundColor: '#FFFFFF' }, headerTintColor: '#101828' }} />; }
