import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { authStorage } from '@/lib/auth-storage';
import { getPublicEnvironment } from '@/lib/env';

const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
