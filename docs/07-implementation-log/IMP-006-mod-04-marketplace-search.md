# IMP-006 — Primera implementación de MOD-04

**Fecha:** 2026-09-28  
**Módulo:** `MOD-04 — Marketplace / Explorar`  
**Requisitos:** `RF-031..RF-041`, `RNF-021..RNF-027`  
**Pruebas:** `TEST-080..TEST-109`  
**Estado:** Completo y validado

## Objetivo

Implementar búsqueda pública segura, filtrada, geográfica y paginada para workers aprobados, y conectar la experiencia móvil Explore sin anticipar MOD-05 ni módulos transaccionales.

## Cambios realizados

- Migración MOD-04 con índices y RPC marketplace allowlist.
- Suite pgTAP de elegibilidad, privacidad, filtros, distancia, orden y paginación.
- Módulo móvil de tipos, validación, servicio, componentes y pantalla Explore.
- Ubicación foreground opcional y efímera.
- Home/navegación conectados y contrato mínimo `workerId` para MOD-05.
- Documentación y trazabilidad de requisitos/pruebas.
- Al denegar ubicación se eliminan también las coordenadas previamente aplicadas y se relanza una búsqueda normal sin ubicación.

## Correcciones posteriores a la primera ejecución pgTAP

- Las llamadas SQL directas a filtros `smallint` ahora tipan explícitamente los literales de experiencia y disponibilidad. La firma productiva y los nombres enviados por móvil ya eran consistentes y no se cambiaron.
- La prueba de `worker_locations` reconoce el grant `SELECT` owner/admin creado por MOD-02 y comprueba su frontera real: RLS owner/admin, ningún acceso de `anon`, ningún acceso de cliente a ubicaciones y ninguna lectura cruzada entre workers.
- La validación productiva de `price_asc` ahora rechaza también `pricing_type IS NULL`; se corrigió el efecto de `NULL NOT IN (...)` para imponer el contrato ya documentado.

## Límites

Sin entidades nuevas, cambios al esquema congelado, SELECT público amplio, exposición de Storage/ubicación privada, reputación, perfil público completo, solicitudes, cotizaciones, bookings, reviews, chat, favoritos, certificación ni pagos.

## Validación ejecutada

| Control | Resultado |
|---|---|
| TypeScript `npx tsc --noEmit` | Aprobado. |
| ESLint `npm run lint` | Aprobado. |
| Jest `npm test -- --runInBand` | Aprobado: 6 suites, 61 pruebas. |
| Expo export web | Aprobado. |
| Dependencias Expo | Alineadas; `npx expo install --check` aprobado. |
| Expo Doctor | Aprobado: 21/21. |
| Compatibilidad Jest | `moduleDirectories` conserva `node_modules` y agrega `<rootDir>/node_modules/expo/node_modules`; `expo-modules-core` permanece transitiva y no se agregó como dependencia directa. |
| Reset local Supabase CLI `2.118.0` | Aprobado; aplicó MOD-01 a MOD-04. |
| pgTAP completo | Aprobado: 4 archivos, 213 aserciones; MOD-04 ejecutó 54/54. |
| Supabase vinculado | `20260928010000_mod04_marketplace_search.sql` aplicada; historiales local y remoto sincronizados. |
| Lint del esquema vinculado | `public`/`private`: `No schema errors found`. |
| `git diff --check` | Aprobado; advertencias LF/CRLF únicamente informativas. |

## Cierre de validación de MOD-04 — actualización 2026-09-28

La validación automatizada confirmó que solo aparecen workers aprobados y elegibles; cuentas, estados y servicios inactivos o no aprobados quedan excluidos. La RPC conserva su allowlist, no expone coordenadas privadas ni datos administrativos, bloquea acceso anónimo y no permite lectura cruzada de ubicaciones. Búsqueda textual, filtros, PostGIS, distancia segura, orden, deduplicación y paginación aprobaron localmente.

La migración MOD-04 quedó desplegada en el proyecto Supabase de desarrollo vinculado, con historial sincronizado y lint de esquemas sin errores. No se modificaron reglas congeladas ni se amplió RLS para cerrar la validación.

No se confirmó explícitamente un smoke test manual Android. Permiso de ubicación, búsqueda y navegación en dispositivo quedan diferidos a la integración móvil continua y a las pruebas E2E finales; no se presentan como aprobados.

**Resultado:** MOD-04 completo y validado en implementación y alcance automatizado para `RF-031..RF-041` y `RNF-021..RNF-027`, con verificación manual Android diferida.
