// TypeScript fallback; Expo resolves auth-storage.native.ts or
// auth-storage.web.ts for the corresponding platform at bundle time.
export { authStorage } from '@/lib/auth-storage.web';
