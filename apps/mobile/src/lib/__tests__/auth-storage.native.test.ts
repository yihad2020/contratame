import { LargeSecureStore } from '@/lib/auth-storage.native';

const mockEncryptedValues = new Map<string, string>();
const mockSecureKeys = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockEncryptedValues.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockEncryptedValues.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockEncryptedValues.delete(key); }),
  },
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  getItemAsync: jest.fn(async (key: string) => mockSecureKeys.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecureKeys.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecureKeys.delete(key); }),
}));

describe('almacenamiento seguro nativo de sesión', () => {
  beforeEach(() => {
    mockEncryptedValues.clear();
    mockSecureKeys.clear();
  });

  it('cifra y recupera una sesión mayor al tamaño directo práctico de SecureStore', async () => {
    const storage = new LargeSecureStore();
    const largeSession = JSON.stringify({ access_token: 'a'.repeat(5000), refresh_token: 'r'.repeat(5000) });

    await storage.setItem('supabase-session', largeSession);

    expect(mockEncryptedValues.get('supabase-session')).not.toBe(largeSession);
    expect(mockSecureKeys.get('supabase-session')).toHaveLength(64);
    await expect(storage.getItem('supabase-session')).resolves.toBe(largeSession);
  });

  it('elimina tanto el valor cifrado como su clave segura', async () => {
    const storage = new LargeSecureStore();
    await storage.setItem('supabase-session', 'session-value');

    await storage.removeItem('supabase-session');

    expect(mockEncryptedValues.has('supabase-session')).toBe(false);
    expect(mockSecureKeys.has('supabase-session')).toBe(false);
  });
});
