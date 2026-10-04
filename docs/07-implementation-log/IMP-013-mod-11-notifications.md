# IMP-013 — Primera implementación de MOD-11

**Fecha:** 2026-10-04  
**Módulo:** `MOD-11 — Notificaciones`  
**Requisitos:** `RF-097..RF-106`, `RNF-063..RNF-069`  
**Pruebas:** `TEST-350..TEST-399`  
**Estado:** COMPLETE / validación automatizada aprobada; Android manual y push diferidos

## Objetivo y cambios

- Mantener `notifications` como fuente canónica y su estructura congelada sin cambios.
- Agregar índices owner/order y owner/unread.
- Agregar RPCs owner-only para inbox keyset, reconciliación, contador y lectura idempotente.
- Habilitar SELECT RLS para Postgres Changes y publicar la tabla, sin conceder DML.
- Integrar bandeja móvil, badge, refresh, paginación, estados, navegación segura y Realtime reconciliado.
- Cubrir modelo móvil y seguridad/contratos DB con Jest y pgTAP.
- Documentar requisitos, módulo, pruebas y decisiones diferidas.

## Push

Se inspeccionó la guía vigente de Expo/Supabase compatible con SDK 57. Push remoto Android requiere `expo-notifications`, desarrollo nativo/EAS y credenciales FCM v1; Expo Go no lo prueba. No se eligió proveedor ni se materializó `device_push_tokens` porque el modelo congelado deja esa decisión pendiente. Se requiere aprobación de proveedor/dispatcher, Firebase/EAS, momento de consentimiento y lifecycle de token. Inbox y Realtime permanecen independientes.

## Archivos principales

- `supabase/migrations/20261004020000_mod11_notifications.sql`
- `supabase/tests/database/mod11_notifications.test.sql`
- `apps/mobile/src/modules/notification/`
- `apps/mobile/src/app/(app)/notifications.tsx`
- ajustes acotados de header/home/iconos
- documentos MOD-11 e índices

## Validación

| Control | Resultado |
|---|---|
| Reset local | **PASS**: MOD-01 a MOD-11 aplicados desde cero. |
| pgTAP | **PASS**: 11 archivos / 683 aserciones; MOD-11 62/62. |
| Lint SQL | **PASS**: `public/private`, sin errores. |
| TypeScript | **PASS**. |
| ESLint | **PASS**. |
| Jest | **PASS**: 14 suites / 157 pruebas. |
| Expo Doctor | **PASS**: 21/21. |
| Dependencias Expo | **PASS**: alineadas con SDK 57. |
| Expo web export | **PASS**. |
| `git diff --check` | **PASS**. |
| Dry-run enlazado | **PASS**: propondría solo `20261004020000_mod11_notifications.sql`; no aplicó cambios. |
| Android físico (`TEST-399`) | **DIFERIDO**. |
| Push Android/EAS/FCM | **DIFERIDO** por decisión y credenciales externas pendientes. |

No se ejecutó despliegue remoto, commit ni push. La implementación in-app y la validación automatizada quedan completas; no se registra PASS para Android físico ni push.

## Decisiones preservadas

No se modificaron reglas/eventos de MOD-06 a MOD-10, entidad congelada, autorización de pantallas destino ni atomicidad. Retención, expiración, borrado, preferencias y push siguen explícitamente pendientes.
