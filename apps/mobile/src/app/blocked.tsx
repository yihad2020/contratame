import { AppButton } from '@/components/ui/AppButton'; import { Screen } from '@/components/ui/Screen'; import { Body, Title } from '@/components/ui/Typography'; import { useAuth } from '@/modules/auth/auth-context';
export default function BlockedScreen() {
  const { state, signOut } = useAuth(); const suspended = state === 'suspended';
  return <Screen><Title>{suspended ? 'Cuenta suspendida' : 'Cuenta desactivada'}</Title><Body>{suspended ? 'Tu cuenta no puede acceder a funciones protegidas mientras permanezca suspendida.' : 'Tu cuenta está desactivada y no puede acceder a funciones protegidas.'}</Body><Body muted>La reactivación y el proceso administrativo están fuera de MOD-01.</Body><AppButton label="Cerrar sesión" onPress={() => void signOut()} /></Screen>;
}
