# MOD-07 — Cotizaciones, revisiones y aceptación

**Estado:** Implementado y validado localmente; dry-run vinculado aprobado, integración real y Android diferidos  
**Requisitos:** `RF-058..RF-066`, `RNF-039..RNF-043`  
**Pruebas:** `TEST-180..TEST-219`  
**Registro:** `IMP-009`

## 1. Objetivo y responsabilidades

MOD-07 completa el tramo solicitud → cotización → aceptación. El worker destinatario crea revisiones inmutables, ambos participantes consultan el historial y el cliente acepta la revisión vigente con un horario definitivo. La aceptación materializa el booking congelado como handoff para MOD-08, sin implementar todavía su ciclo operativo.

## 2. Modelo congelado materializado

```text
service_requests 1 ── N quotes
service_requests 1 ── 0..1 bookings
quotes           1 ── 0..1 bookings
bookings         1 ── N booking_status_history
profiles         1 ── N notifications
```

La migración materializa `quotes`, `bookings` y `booking_status_history` con las columnas, estados y relaciones de `logical-schema-v1.md`. Reutiliza `service_requests`, `worker_profiles`, `worker_services`, `service_request_locations` y `notifications`; no agrega entidades ni cambia documentos congelados.

## 3. Contratos PostgreSQL

### `create_service_request_quote(uuid, numeric, text, date, time)`

Deriva el actor worker desde `auth.uid()`, bloquea la solicitud y verifica propiedad, cuenta activa/confirmada, aprobación vigente y estado `pending`/`quoted`. Valida monto y vigencia opcional; calcula el número siguiente bajo lock, marca la revisión pendiente anterior `superseded`, inserta la nueva `pending` y cambia la solicitud inicial a `quoted`.

El contrato no recibe `worker_id`, `revision_number` ni `status`. Fecha/hora de vigencia son parámetros de entrada que PostgreSQL convierte al único campo congelado `valid_until`; no crean columnas nuevas.

### `list_my_service_request_quotes(uuid)`

Exige participación como cliente o worker y devuelve todas las revisiones en orden descendente. La allowlist incluye campos de quote, indicador de revisión actual y únicamente `booking_id`/`scheduled_at` para la revisión aceptada. No devuelve contacto, Auth, roles, datos administrativos ni ubicación.

### `accept_service_request_quote(uuid, date, time)`

Deriva el cliente, exige fecha/hora completas, construye `scheduled_at` en PostgreSQL mediante `America/La_Paz`, resuelve la solicitud desde la quote y bloquea la solicitud antes de revalidar. Solo acepta la revisión máxima `pending`, vigente y perteneciente a una solicitud `quoted` del caller, con worker todavía elegible.

Dentro de la misma sentencia:

1. quote pasa a `accepted`;
2. request pasa a `accepted`;
3. se crea booking `scheduled` con snapshots de servicio y monto;
4. se crea el primer historial `NULL → scheduled`;
5. se crean notificaciones persistentes para worker y cliente;
6. se devuelve el handoff mínimo.

Cualquier fallo revierte todos los pasos.

## 4. Revisiones y concurrencia

Todas las operaciones que compiten bloquean primero `service_requests`. Dos revisiones concurrentes se serializan antes de leer `max(revision_number)`; la unicidad `(service_request_id, revision_number)` es la segunda barrera. Índices parciales permiten como máximo una quote `pending` y una `accepted`.

Aceptación y revisión compiten por el mismo lock. Tras adquirirlo, aceptación vuelve a leer revisión, estado, número máximo y vigencia. Dos aceptaciones no pueden crear dos bookings por el lock y las unicidades de `bookings.service_request_id`/`accepted_quote_id`.

## 5. Horario definitivo

Las preferencias de MOD-06 permanecen independientes y sin mutación. La UI precarga los valores disponibles, exige completar ambos y permite editarlos. Envía `date` y `time`, nunca un `scheduled_at` autoritativo. La base combina ambos bajo `America/La_Paz`, exige un instante futuro y guarda el resultado en `timestamptz`.

```text
preferencias opcionales
        ↓ solo precarga
confirmación explícita del cliente
        ↓ date + time
PostgreSQL / America/La_Paz
        ↓
bookings.scheduled_at
```

## 6. Experiencia móvil

El detalle existente incorpora un panel de cotizaciones:

- worker: primera cotización o nueva revisión, monto, mensaje y vigencia opcional, historial read-only;
- customer: historial, revisión actual, precio y estado;
- aceptación: acción por monto, segunda etapa explícita, fecha/hora definitivas y confirmación;
- éxito: solicitud aceptada y booking programado como estado mínimo de handoff;
- errores: mensajes seguros, reintento de lectura y protección de doble envío.

No se agregan rutas o pantallas de booking. La navegación de MOD-06 permanece igual.

## 7. Seguridad y privacidad

- Las tres RPC usan `SECURITY DEFINER`, `search_path = ''`, objetos calificados y cuentas activas/confirmadas.
- Ninguna identidad de actor ni estado interno se acepta desde Expo.
- `authenticated` carece de mutación directa sobre quotes, bookings, historial y solicitudes; `anon` carece de RPC y lectura.
- RLS defensiva limita las tres entidades a participantes.
- La ubicación exacta sigue oculta al worker antes de booking; después de la contratación, la política y `get_my_service_request` permiten únicamente al worker destinatario acceder a esa ubicación.
- Marketplace y perfil público permanecen quote-free y location-free.
- No existe `service_role` ni secreto privilegiado en móvil.

## 8. Estados implementados

```text
service_requests.pending
  └─ primera quote ─► service_requests.quoted

quotes.pending
  └─ nueva revisión ─► quotes.superseded + nueva quotes.pending

service_requests.quoted + quotes.pending vigente
  └─ aceptación cliente ─► request accepted + quote accepted + booking scheduled
```

Los estados congelados `rejected`, `withdrawn` y `expired` siguen reconocidos, pero MOD-07 no crea transiciones no documentadas para ellos.

## 9. Notificaciones

Solo la aceptación crea notificaciones en MOD-07, porque el contrato transaccional congelado las exige. Se registra `quote_accepted` para el worker y `booking_created` para el cliente, ambas relacionadas al booking. No hay push, bandeja ni infraestructura de entrega nueva. La creación de quote/revisión no inventa notificaciones adicionales.

## 10. Fuera de alcance

Ciclo de booking, inicio/finalización, cancelación, rechazo/retiro de cotización, chat/mensajes, reseñas, push, favoritos, certificación y pagos. MOD-08 asumirá el booking ya creado y programado.

## 11. Validación actual

El reset local aplica MOD-01 a MOD-07. pgTAP aprueba **7 archivos / 411 aserciones**, incluidas **80/80** de MOD-07. También aprueban TypeScript, ESLint, Jest (**9 suites / 104 pruebas**, sin snapshots), Expo Doctor (**21/21**), alineación de dependencias, export web y `git diff --check`. El dry-run vinculado lista únicamente `20260930010000_mod07_quotes.sql` y no aplica cambios. Integración real y Android permanecen diferidos.
