# IMP-012 — Primera implementación de MOD-10

**Fecha:** 2026-10-04  
**Módulo:** `MOD-10 — Chat / Mensajería en tiempo real`  
**Requisitos:** `RF-085..RF-096`, `RNF-055..RNF-062`  
**Pruebas:** `TEST-300..TEST-349`  
**Estado:** COMPLETE / validación automatizada aprobada; verificación manual diferida

## Cambios

- Migración `20261004010000_mod10_chat.sql` con la entidad congelada `messages`.
- Checks `text/system` y regla aprobada de 1–2.000 Unicode solo para user text.
- RPC de envío idempotente, contexto por conversación/solicitud, inbox e historia/reconciliación keyset.
- RLS SELECT participante para Postgres Changes; DML directo revocado; publicación Realtime.
- Notificación persistente `message_received` atómica, sin push/unread.
- Módulo móvil `chat` con tipos, lógica, errores, servicio, suscripción, bandeja y conversación.
- Rutas reales, pestaña Chat y CTA desde detalle de solicitud.
- pgTAP/Jest y documentación trazable.

## Decisiones preservadas

Sin grupo, DM libre, edición/eliminación, adjuntos, typing, presencia, read receipts, llamadas, push o polling. `read_at` no se fabrica. Sistema conserva sender opcional y no se expone a creación cliente. Retención y política de cierre permanecen pendientes.

Postgres Changes fue seleccionado como integración mínima soportada para el MVP: evento persistido, filtro por conversación y autorización RLS. El móvil reconcilia tras cada suscripción/reconexión y elimina el canal al desmontar.

## Validación

| Control | Resultado |
|---|---|
| Reset local | **PASS**: MOD-01 a MOD-10 aplicados desde cero. |
| pgTAP | **PASS**: 10 archivos / 621 aserciones; MOD-10 84/84. |
| Lint SQL | **PASS**: `public/private`, sin errores. |
| TypeScript | **PASS**. |
| ESLint | **PASS**. |
| Jest | **PASS**: 12 suites / 142 pruebas. |
| Expo Doctor | **PASS**: 21/21. |
| Dependencias Expo | **PASS**: actualizadas/alineadas. |
| Expo web export | **PASS**. |
| `git diff --check` | **PASS**. |
| Dry-run enlazado | **PASS**: propondría solo `20261004010000_mod10_chat.sql`; no aplicó cambios. |
| Android/dos sesiones reales | **DIFERIDO**. |

No se ejecutó despliegue remoto, commit ni push. La implementación y validación automatizada quedan completas; no se registra PASS para Android ni para la integración de dos sesiones reales hasta ejecutarlas.

