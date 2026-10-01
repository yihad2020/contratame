# MOD-08 — Ciclo de vida de la contratación

**Estado:** Implementado; validación móvil aprobada, pgTAP local bloqueado y Android/Supabase real diferidos

**Requisitos:** `RF-067..RF-075`, `RNF-044..RNF-048`

**Pruebas:** `TEST-220..TEST-259`

**Registro:** `IMP-010`

## 1. Objetivo y límite

MOD-08 toma el booking `scheduled` creado atómicamente por MOD-07 y gestiona su ciclo operativo hasta `completed`. No crea bookings, no modifica solicitud/cotización aceptadas y no implementa reviews ni cancelación.

```text
MOD-07                         MOD-08
quote accepted ─► booking scheduled
                              └─ worker ─► in_progress
                                           └─ worker ─► completion_pending
                                                        └─ customer ─► completed
```

## 2. Entidades congeladas utilizadas

- `bookings`: estado actual, participantes, snapshot contractual, horario y timestamps.
- `booking_status_history`: historial append-only de cada transición.
- `service_requests`, `service_request_locations`: resumen y ubicación exacta del trabajo ya autorizada después de booking.
- `quotes`: cotización aceptada que origina el booking.
- `worker_profiles`, `profiles`: propiedad y nombres públicos minimizados.
- `notifications`: eventos persistentes del ciclo, sin push.

No se agregan entidades, columnas, estados ni relaciones.

## 3. Contratos PostgreSQL

### `start_booking(uuid)`

Worker asignado, `scheduled → in_progress`, `started_at` servidor, historia y notificación al cliente.

### `request_booking_completion(uuid)`

Worker asignado, `in_progress → completion_pending`, `completion_requested_at` servidor, historia y notificación al cliente.

### `confirm_booking_completion(uuid)`

Cliente participante, `completion_pending → completed`, `completed_at` servidor, historia y notificación al worker.

### `list_my_bookings(text, integer, integer)`

Lista allowlist por perspectiva `customer`/`worker`, orden `scheduled_at DESC, id DESC`, máximo 20 y conteo total.

### `get_my_booking(uuid)`

Detalle participante en una sola respuesta: contrato, contraparte minimizada, descripción, ubicación exacta posbooking, timestamps e historial JSON seguro sin IDs de actores.

### `get_my_service_request(uuid)`

Conserva el contrato participante de MOD-07 y agrega `booking_id` para el handoff de navegación sin consulta adicional.

## 4. Seguridad y concurrencia

Las funciones derivan `auth.uid()`, exigen la frontera activa/confirmada de MOD-01, fijan `search_path = ''`, bloquean la fila con `FOR UPDATE`, verifican actor y estado exactos y usan grants mínimos. `authenticated` no recibe INSERT/UPDATE/DELETE directo sobre `bookings` o historial. Un fallo en actualización, historial o notificación revierte la operación completa.

El lock y el `WHERE status = estado_esperado` serializan doble toque, dos clientes simultáneos y estado stale. Los saltos y toda transición desde `completed` fallan.

## 5. Privacidad de ubicación

El detalle se limita a cliente y worker asignado. Ambos ya tienen acceso posbooking aprobado por MOD-07; terceros no obtienen fila. La lista no incluye dirección ni coordenadas. `search_marketplace_workers` y `get_public_worker_profile` no se modifican ni consumen bookings.

## 6. Experiencia móvil

- `/(app)/bookings`: lista mínima paginada, con perspectivas cliente/profesional, accesible desde “Solicitudes”.
- `/(app)/booking/[bookingId]`: detalle, contrato, ubicación, estado, timestamps, historial y acción válida.
- Detalle de solicitud: “Ver trabajo” solo con `booking_id` real.
- Estados de espera y `completed`: lectura informativa, sin botones inertes.

## 7. Notificaciones

Se persisten `booking_started`, `booking_completion_requested` y `booking_completed`, siempre dirigidas al otro participante y relacionadas al booking. No existe UI nueva de notificaciones ni entrega push.

## 8. Cancelación pendiente

El modelo físico reserva estado/columnas de cancelación, pero la política detallada sigue pendiente en los documentos congelados. MOD-08 no implementa RPC, botón, timestamp ni notificación de cancelación y no inventa actores o edges.

## 9. Fuera de alcance

Reviews, chat, push, favoritos, certificación, pagos, reprogramación, disputas, no-show, cancelación y administración futura.

## 10. Estado de validación

TypeScript, ESLint, Jest (**10 suites / 120 pruebas**), Expo Doctor (**21/21**), dependencias Expo y export web aprobaron. El dry-run vinculado listó únicamente `20261001010000_mod08_booking_lifecycle.sql` y no aplicó cambios. El reset local y pgTAP no pudieron ejecutarse porque Docker/Supabase local no está disponible y PostgreSQL rechaza `127.0.0.1:54322`; las 66 aserciones de MOD-08 permanecen pendientes de ejecución. Integración real y Android también están diferidos.
