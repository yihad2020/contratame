import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthStorage } from '@/lib/auth-storage.types';

const isServer = typeof window === 'undefined';

export const authStorage: AuthStorage = {
  async getItem(key) {
    return isServer ? null : AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (!isServer) await AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (!isServer) await AsyncStorage.removeItem(key);
  },
};
