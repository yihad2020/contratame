# IMP-009 — Primera implementación de MOD-07

**Fecha:** 2026-09-30  
**Módulo:** `MOD-07 — Cotizaciones, revisiones y aceptación`  
**Requisitos:** `RF-058..RF-066`, `RNF-039..RNF-043`  
**Pruebas:** `TEST-180..TEST-219`  
**Estado:** Implementado y validado localmente; dry-run vinculado aprobado, integración real y Android diferidos

## Objetivo

Implementar cotización dirigida, revisiones históricas y aceptación del cliente, preservando el contrato congelado que crea booking e historial atómicamente y resolviendo explícitamente la captura del horario definitivo.

## Cambios

- Migración `20260930010000_mod07_quotes.sql` con las entidades congeladas `quotes`, `bookings` y `booking_status_history`.
- Constraints e índices para revisión única, una revisión vigente, una aceptada y un booking por solicitud/quote.
- RPC `create_service_request_quote(...)` para primera quote y revisiones inmutables.
- RPC `list_my_service_request_quotes(uuid)` para historial participante ordenado y handoff mínimo.
- RPC `accept_service_request_quote(uuid,date,time)` para aceptación y booking atómicos.
- Validación del booking contra request/quote aceptados mediante trigger de integridad.
- Política de ubicación transaccional extendida para habilitar al worker solo después del booking, conservando el nombre histórico que requieren las regresiones MOD-06.
- `get_my_service_request` actualizado para devolver dirección/coordenadas al worker únicamente cuando existe booking.
- Módulo móvil `quote` con tipos, normalización, validación, errores, servicios y panel de UI integrado al detalle de solicitud.
- Worker: crear cotización/revisión y ver historial read-only.
- Cliente: ver historial, identificar revisión actual, confirmar monto y horario y aceptar.
- Suite pgTAP MOD-07 de 79 aserciones y suite Jest de lógica pura.
- Documentación `RF/RNF → MOD-07 → TEST → IMP-009` e índices actualizados.

## Decisión de horario aplicada

`service_requests.preferred_date` y `preferred_time` siguen opcionales, independientes e históricos. La UI solo los utiliza como precarga y permite editarlos. Aceptar exige fecha y hora completas; Expo envía ambos valores separados y PostgreSQL crea el `timestamptz` autoritativo con `America/La_Paz`. Las preferencias no cambian.

No se hizo nullable `bookings.scheduled_at`, no se postergó el booking y no se fabricó un horario desde datos incompletos. La decisión resuelve el bloqueo inicial sin rediseñar entidades.

## Seguridad y concurrencia

- Actores derivados de `auth.uid()`; ninguna RPC acepta identidad privilegiada o estados internos.
- Cuenta confirmada/activa obligatoria, worker propietario/aprobado y cliente propietario revalidados en PostgreSQL.
- Funciones `SECURITY DEFINER` con `search_path = ''`, objetos calificados y `EXECUTE` solo para `authenticated`.
- Sin mutación directa cliente de quotes, requests, bookings o historial; sin acceso `anon`.
- Lock de request compartido por revisión y aceptación; número siguiente calculado bajo lock.
- Unicidades de revisión, pendiente, aceptada, request booking y accepted quote booking.
- Aceptación revalida estado, revisión máxima y vigencia después del lock.
- Prueba de fallo inducido en notificación confirma rollback de quote, request, booking e historial.
- Ubicación exacta permanece cerrada antes de booking y para terceros.
- Sin `service_role`, secretos o dependencia móvil nueva.

## Estados y límites

Se implementan `pending → quoted`, revisión `pending → superseded` y aceptación `quoted/pending → accepted/accepted`, seguida por booking `scheduled`. No se implementan rechazo/retiro/expiración activa de quote, cancelación, ciclo de booking, review, chat, push, favoritos, certificación ni pagos.

La aceptación crea dos notificaciones persistentes exigidas por el contrato: `quote_accepted` para el worker y `booking_created` para el cliente. La creación/revisión no inventa notificaciones.

## Validación

| Control | Resultado |
|---|---|
| Reset local Supabase CLI `2.118.0` | Aprobado; aplicó MOD-01 a MOD-07. |
| pgTAP completo | Aprobado: **7 archivos / 411 aserciones**; MOD-07 ejecutó **80/80**. |
| Jest | Aprobado: **9 suites / 104 pruebas**, sin snapshots. |
| TypeScript | Aprobado. |
| ESLint | Aprobado. |
| Expo Doctor | Aprobado: **21/21**. |
| Dependencias Expo | Alineadas; `npx expo install --check` aprobado. |
| Export web | Aprobado. |
| `git diff --check` | Aprobado. |
| Dry-run vinculado | Aprobado; listó solo `20260930010000_mod07_quotes.sql` y no aplicó cambios. |
| Android / Supabase real | No ejecutado; diferido. |

No se ejecutó commit, push ni despliegue remoto.
