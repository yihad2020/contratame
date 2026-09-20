# IMP-001 — Primera implementación de MOD-01

**Fecha:** 2026-09-10  
**Módulo:** `MOD-01 — Autenticación y perfiles de usuario`  
**Requisitos:** `RF-001..RF-010`, `RNF-001..RNF-007`  
**Pruebas:** `TEST-001..TEST-025`  
**Estado:** Implementado; validación estática aprobada, integración local pendiente

## Cambios

- Aplicación móvil Expo/React Native/TypeScript en `apps/mobile` con Expo Router.
- Registro e inicio de sesión por correo/contraseña, confirmación, reenvío, deep link, logout y restauración de sesión.
- Perfil propio con lectura y edición limitada a nombre, apellido y teléfono.
- Estados de navegación cerrados para correo no confirmado, perfil ausente, error, suspensión y desactivación.
- Configuración local de Supabase con confirmación obligatoria y contraseña mínima de ocho caracteres.
- Migración para `profiles`, `user_roles`, aprovisionamiento automático, RPC controlada, grants y RLS.
- Pruebas Jest de validación/estado y script estructural de base de datos.
- Actualización de requisitos, módulo y plan de pruebas con las decisiones aprobadas.
- Corrección de la comprobación de correo para usar `auth.getUser()` fresco incluso cuando `session.user` permanezca obsoleto.
- Sustitución de persistencia nativa plana por el patrón oficial `LargeSecureStore`; web mantiene un adaptador separado.
- Eliminación del script de plantilla `reset-project` que apuntaba a un archivo inexistente.

## Seguridad

- La app usa exclusivamente URL y clave publicable desde `EXPO_PUBLIC_*`; no contiene `service_role`.
- El correo y las credenciales permanecen en `auth.users`.
- `profiles` no permite inserción ni actualización directa del cliente.
- `user_roles` no concede acceso al rol `authenticated`.
- La RPC verifica correo confirmado y perfil `active` en base de datos.
- Las funciones `SECURITY DEFINER` fijan `search_path` seguro.
- En Android/iOS, las sesiones se cifran con el patrón documentado por Supabase: ciphertext en AsyncStorage y clave AES-256 en Expo SecureStore; no se persisten credenciales privilegiadas.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `npm run typecheck` | Aprobada. |
| `npm run lint` | Aprobada. |
| `npm run test:ci` | Aprobada: 4 suites, 23 pruebas. Incluye sesión Auth obsoleta, salida de la ruta de verificación y payload nativo mayor a 10 KB. |
| `npx expo install --check` | Aprobada: dependencias compatibles con SDK 57. |
| `npx expo-doctor@latest` | Aprobada: 21/21 controles. |
| `npx expo config --type public` | Aprobada. |
| `npx expo export --platform web` con valores públicos locales de prueba | Aprobada; bundle generado en `dist/` ignorado por Git. |
| `npx expo export --platform android` con valores públicos locales de prueba | Aprobada; confirma resolución y bundle del adaptador nativo. |
| `git diff --check` | Aprobada. |
| Documentos congelados de base de datos | Sin cambios. |
| Revisión de secretos | Sin credenciales; solo referencias documentales a `service_role`. |

## Validaciones no ejecutadas

- `npx supabase test db`: no ejecutada porque no existe PostgreSQL local en `127.0.0.1:54322` y Docker no está disponible. La CLI indicó iniciar la pila con `supabase start`.
- Integración Auth/RLS, entrega de correo y deep link en dispositivo: requieren proyecto Supabase de desarrollo, SMTP/configuración de redirección y credenciales públicas reales.

## Riesgo de dependencias conocido

`npm audit --omit=dev` reporta 14 vulnerabilidades moderadas transitivas en la cadena Expo (`decode-uri-component` y `uuid`). La corrección automática propuesta exige cambios incompatibles/downgrades de Expo Router o Splash Screen, por lo que no se aplicó `--force`. Expo Doctor y la compatibilidad de SDK sí pasan.

## Pendiente fuera del alcance

Recuperación/cambio de credenciales, avatar, administración de cuentas/roles, cierre global, trabajadores y demás módulos de marketplace. No se implementaron reglas para esas áreas.

## Validación SQL posterior — 2026-09-17

El antiguo script SQL estructural se convirtió en una suite pgTAP con `plan(18)`, 18 aserciones y `finish()`. Tras `npx supabase db reset --local`, `npx supabase test db` aprobó MOD-01 (18/18). Esta actualización afecta solo pruebas y documentación; la migración MOD-01 y sus controles de seguridad no cambiaron. Las limitaciones históricas de Docker anteriores no describen el entorno actual.
