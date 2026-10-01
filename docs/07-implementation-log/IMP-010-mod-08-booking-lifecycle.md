# IMP-010 — Primera implementación de MOD-08

**Fecha:** 2026-10-01

**Módulo:** `MOD-08 — Ciclo de vida de la contratación`

**Requisitos:** `RF-067..RF-075`, `RNF-044..RNF-048`

**Pruebas:** `TEST-220..TEST-259`

**Estado:** Implementado; validación móvil aprobada, pgTAP local bloqueado y Android/Supabase real diferidos

## Objetivo

Gestionar de forma segura el booking `scheduled` creado por MOD-07 hasta la confirmación `completed`, sin duplicar la creación contractual ni anticipar reviews o cancelación.

## Cambios

- Migración `20261001010000_mod08_booking_lifecycle.sql` sin entidades ni columnas nuevas.
- RPC estrechas `start_booking`, `request_booking_completion` y `confirm_booking_completion`.
- RPC participante paginada `list_my_bookings` y detalle `get_my_booking` con historial/ubicación segura.
- `get_my_service_request` extendida con `booking_id` para navegación directa.
- Locks, timestamps del servidor, historial append-only, notificaciones y rollback transaccional.
- Módulo móvil `booking` con tipos, normalización, errores, servicio, lista y detalle.
- Rutas `/(app)/bookings` y `/(app)/booking/[bookingId]`; acceso desde Solicitudes y handoff real desde request.
- Ajuste compatible del cargador de cotizaciones para satisfacer las reglas actuales de pureza de React/ESLint y conservar la presentación de vigencia expirada, sin cambiar contratos MOD-07.
- Suite pgTAP MOD-08 de 66 aserciones y Jest de lógica pura.
- Documentación `RF/RNF → MOD-08 → TEST → IMP-010` e índices actualizados.

## Actores y estado

La sección 14 de `conceptual-erd-v1.md` define: worker inicia, worker solicita finalización y cliente confirma. La implementación aplica exclusivamente:

```text
scheduled --worker--> in_progress
in_progress --worker--> completion_pending
completion_pending --customer--> completed
```

No existe transición genérica ni identidad/estado/timestamp enviado por móvil.

## Seguridad y privacidad

- Caller derivado de `auth.uid()`, cuenta confirmada/activa y participación revalidada.
- `SECURITY DEFINER`, `search_path = ''`, objetos calificados y grants estrechos.
- Sin UPDATE directo de booking ni mutación directa de historial.
- Detalle/ubicación solo para participantes; listas sin coordenadas; marketplace/perfil público intactos.
- Historial devuelve rol seguro, no UUID del actor.
- Sin `service_role`, secreto o dependencia nueva.

## Atomicidad y concurrencia

Cada RPC usa `FOR UPDATE`, exige estado exacto, actualiza una sola transición, agrega una historia y notifica dentro de la misma sentencia. La revalidación `WHERE status = esperado` y el lock rechazan dobles acciones o clientes stale. Una prueba de fallo inducido de notificación verifica rollback de estado, timestamp e historial.

## Conflicto de cancelación

El esquema congelado representa cancelación, pero `conceptual-erd-v1.md`, `logical-schema-v1.md` y `project-definition.md` mantienen pendiente la política detallada. No se implementó una RPC ni UI de cancelación porque faltan actores, source states y regla de motivo. No existe conflicto estructural ni se requiere rediseño.

## Validación

| Control | Resultado |
|---|---|
| TypeScript `npx tsc --noEmit` | Aprobado. |
| ESLint `npm run lint` | Aprobado. |
| Jest `npm test -- --runInBand` | Aprobado: **10 suites / 120 pruebas**, sin snapshots. |
| Expo Doctor | Aprobado: **21/21**. |
| Dependencias Expo | Alineadas. |
| Export web | Aprobado. |
| Dry-run vinculado | Aprobado; lista únicamente `20261001010000_mod08_booking_lifecycle.sql`, sin aplicar cambios. |
| Reset local / pgTAP | Bloqueado: Docker no está disponible y PostgreSQL local rechaza `127.0.0.1:54322`. Las **66 aserciones** MOD-08 no se presentan como aprobadas. |
| Supabase real / Android | No ejecutado; diferido. |

No se ejecutó despliegue remoto, commit ni push. La implementación no se considera completamente validada hasta ejecutar reset y las ocho suites pgTAP en una base local desechable.
