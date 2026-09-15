# Contrátame! — aplicación móvil

Cliente Android-first de `MOD-01`, construido con Expo SDK 57, React Native, TypeScript y Expo Router.

## Configuración

1. Copia `.env.example` a `.env`.
2. Completa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con valores públicos del proyecto de desarrollo.
3. Aplica las migraciones de `../../supabase/migrations` y configura `contratame://verify-email` como URL de redirección.
4. Ejecuta `npm start` o `npm run android`.

Nunca coloques una clave `service_role` en esta aplicación.

En Android/iOS, Supabase Auth usa el adaptador `LargeSecureStore`: guarda la sesión cifrada en AsyncStorage y la clave en Expo SecureStore. En web se selecciona un adaptador AsyncStorage separado.

## Validación

```powershell
npm run typecheck
npm run lint
npm run test:ci
npx expo config --type public
```
