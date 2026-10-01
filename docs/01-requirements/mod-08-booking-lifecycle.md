# Contrátame! — Requisitos de MOD-08: ciclo de vida de la contratación

**Módulo:** `MOD-08 — Ciclo de vida de la contratación`

**Implementación:** `IMP-010`

**Pruebas:** `TEST-220..TEST-259`

**Estado:** Implementado; validación móvil aprobada, pgTAP local bloqueado y Android/Supabase real diferidos

## 1. Objetivo

Permitir que los participantes gestionen un booking ya creado por MOD-07 desde `scheduled` hasta `completed`, con actores, transiciones, timestamps, historial y notificaciones controlados por PostgreSQL. MOD-08 no vuelve a crear la contratación ni modifica la solicitud, cotización, precio o horario acordados.

## 2. Reglas aprobadas

- MOD-07 entrega un booking `scheduled`, solicitud/cotización `accepted` y primer historial `NULL → scheduled`.
- El ciclo principal congelado es `scheduled → in_progress → completion_pending → completed`.
- El trabajador asignado inicia el trabajo y solicita la finalización; el cliente participante confirma la finalización. Estas responsabilidades provienen de `conceptual-erd-v1.md`, sección 14.
- No existe finalización automática. `completed` es terminal para el ciclo implementado.
- `started_at`, `completion_requested_at` y `completed_at` son timestamps del servidor. `scheduled_at` permanece como horario autoritativo de MOD-07 con semántica `America/La_Paz`.
- Cada transición exitosa agrega exactamente una fila inmutable en `booking_status_history` y una notificación persistente al otro participante.
- La política de cancelaciones, sus actores, estados origen, motivo, no-show y relación con disputas continúa explícitamente pendiente. MOD-08 reconoce `cancelled`, pero no ofrece una transición hacia ese estado.

## 3. Requisitos funcionales

### RF-067 — Consultar contrataciones participantes

Cliente y trabajador deberán listar y consultar únicamente bookings donde participan.

**Criterios de aceptación:** contratos RPC controlados; perspectivas `customer`/`worker`; detalle con servicio, contraparte minimizada, precio, horario, estado, timestamps, descripción, ubicación autorizada e historial; lista ordenada por `scheduled_at DESC, id DESC`, límite 1–20 y tamaño móvil 12; tercero/anónimo obtiene cero datos.

### RF-068 — Iniciar el trabajo

Solo el trabajador asignado podrá ejecutar `scheduled → in_progress`.

**Criterios de aceptación:** caller derivado de `auth.uid()`; cuenta confirmada/activa; booking bloqueado; estado exacto `scheduled`; `started_at` del servidor; un historial `scheduled → in_progress`; notificación `booking_started` al cliente; cliente, worker ajeno, repetición y estado obsoleto fallan sin cambios parciales.

### RF-069 — Solicitar la finalización

Solo el trabajador asignado podrá ejecutar `in_progress → completion_pending`.

**Criterios de aceptación:** se repiten autorización, lock y revalidación; `completion_requested_at` del servidor; un historial `in_progress → completion_pending`; notificación `booking_completion_requested` al cliente; no se permite desde `scheduled`, `completed` ni mediante repetición.

### RF-070 — Confirmar la finalización

Solo el cliente del booking podrá ejecutar `completion_pending → completed`.

**Criterios de aceptación:** actor cliente derivado; lock y estado exacto; `completed_at` del servidor; un historial `completion_pending → completed`; notificación `booking_completed` al trabajador; worker, cliente ajeno, confirmación repetida y saltos de estado fallan; `completed` no ofrece acción posterior.

### RF-071 — Preservar historial y contrato aceptado

El ciclo deberá preservar la relación inmutable con solicitud y cotización aceptadas y mostrar el historial seguro.

**Criterios de aceptación:** ninguna RPC cambia `service_request_id`, `accepted_quote_id`, participantes, título, precio o `scheduled_at`; el historial normal no admite INSERT/UPDATE/DELETE; el detalle devuelve transiciones ordenadas y rol del actor sin exponer UUID de perfil.

### RF-072 — Aplicar notificaciones persistentes del ciclo

Cada cambio del ciclo principal notificará al participante que debe conocer o actuar sobre el nuevo estado.

**Criterios de aceptación:** inicio y solicitud de finalización notifican al cliente; confirmación notifica al trabajador; usan `notifications`, referencia `booking` y booking real; no agregan push ni bandeja nueva; un fallo de notificación revierte transición, timestamp e historial.

### RF-073 — Presentar el trabajo y acciones válidas en móvil

La ruta protegida `/(app)/booking/[bookingId]` mostrará el booking participante y únicamente la acción vigente para rol/estado.

**Criterios de aceptación:** worker `scheduled` ve “Iniciar trabajo”; worker `in_progress` ve “Marcar trabajo como finalizado”; customer `completion_pending` ve “Confirmar finalización”; estados que esperan al otro actor son informativos; `completed` es solo lectura; carga, no disponible, error/reintento y doble toque están controlados.

### RF-074 — Conectar solicitud y booking real

El detalle de una solicitud aceptada deberá enlazar el booking ya creado por MOD-07.

**Criterios de aceptación:** `get_my_service_request` incluye solo `booking_id` adicional para participantes; “Ver trabajo” usa ese UUID; no recrea datos ni realiza un lookup N+1; solicitudes sin booking no muestran la acción.

### RF-075 — Mantener una lista mínima de trabajos

“Solicitudes” dará acceso a una lista paginada de trabajos como cliente o profesional.

**Criterios de aceptación:** muestra servicio, contraparte segura, precio, horario y estado; usa una RPC por página y deduplica por booking; abre el detalle real; no agrega una pestaña global ni carga historial ilimitado.

## 4. Requisitos no funcionales

### RNF-044 — Autorización y mínimo privilegio

RPC `SECURITY DEFINER`, `search_path = ''`, objetos calificados, actor derivado y `EXECUTE` solo `authenticated`; sin mutación directa de booking/historial, acceso anónimo, `service_role` móvil o identidad enviada por cliente.

### RNF-045 — Integridad, atomicidad y concurrencia

Cada transición bloquea la fila, revalida el estado después del lock, actualiza, agrega historial y notifica en una sentencia transaccional. Repeticiones, clientes stale y carreras se serializan y solo una operación válida puede completar.

### RNF-046 — Privacidad transaccional

Detalle y ubicación exacta son exclusivos de cliente y worker asignado después del booking. Listas omiten ubicación; marketplace y perfil público permanecen aislados; salida omite Auth, contacto, roles, snapshots y administración.

### RNF-047 — Rendimiento, mantenibilidad y compatibilidad

Lista paginada determinística, detalle en una RPC con historial ordenado, TypeScript estricto, lógica fuera de UI y sistema visual existente; sin dependencia ni entidad nueva y compatible con Expo SDK 57.

### RNF-048 — Pruebas, regresión y trazabilidad

`RF-067..RF-075`, `RNF-044..RNF-048`, `MOD-08`, `TEST-220..TEST-259`, migración e `IMP-010` mantienen referencias; pgTAP cubre seguridad/estado/atomicidad y Jest la lógica móvil; MOD-01 a MOD-07 deben permanecer verdes.

## 5. Conflicto de negocio preservado

El esquema contiene `cancelled`, `cancelled_at`, `cancelled_by_profile_id` y `cancellation_reason`, pero los documentos congelados no definen actores, estados desde los cuales cancelar, obligatoriedad/formato del motivo, efectos temporales ni coordinación con disputas/no-show. Implementar esa operación inventaría reglas. La cancelación queda fuera de MOD-08 hasta una decisión explícita; no requiere rediseñar entidades.

## 6. Fuera de alcance

Cancelación; reviews (MOD-09); chat/mensajes; push; favoritos; certificación/pagos; cambios de horario; edición de precio/servicio; disputas/no-show; administración ajena al ciclo.

## 7. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-067..RF-075` | `MOD-08` | `TEST-220..TEST-259` | `IMP-010` |
| `RNF-044..RNF-048` | `MOD-08` | `TEST-220..TEST-259` | `IMP-010` |
