# Contrátame! — Esquema Lógico de Base de Datos v1

## Estado del documento

**Versión:** 1.0  
**Estado:** APPROVED / FROZEN  
**Fecha de congelamiento:** 2026-09-09  
**Nivel:** Esquema lógico  
**SQL implementado:** No  
**Migraciones creadas:** No  
**Supabase modificado:** No  

Este documento constituye el esquema lógico aprobado de Contrátame! para iniciar el desarrollo.

Cualquier modificación estructural posterior deberá documentarse explícitamente.

---

# 1. Convenciones generales

## 1.1 Identificadores

Las entidades de negocio utilizarán `uuid` como clave primaria, salvo excepciones justificadas.

## 1.2 Fechas

Los timestamps utilizarán:

`timestamptz`

## 1.3 Dinero

Los valores monetarios utilizarán:

`numeric(12,2)`

Nunca `float`.

## 1.4 Estados

Inicialmente:

`text + CHECK constraint`

## 1.5 Timestamps

Cuando corresponda:

```text
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

## 1.6 Extensiones previstas

```text
pgcrypto
postgis
```

---

# 2. auth.users

Administrada por Supabase Auth.

No será creada por migraciones de negocio.

Relación:

```text
auth.users.id
    │
    │ 1:1
    ▼
profiles.id
```

---

# 3. profiles

```text
profiles
```

| Columna | Tipo | Nulo | Descripción |
|---|---|---:|---|
| `id` | `uuid` | No | PK + FK `auth.users.id`. |
| `first_name` | `text` | No | Nombre. |
| `last_name` | `text` | No | Apellido. |
| `phone` | `text` | Sí | Teléfono normalizado. |
| `avatar_path` | `text` | Sí | Ruta en Storage. |
| `account_status` | `text` | No | Estado general. |
| `created_at` | `timestamptz` | No | Creación. |
| `updated_at` | `timestamptz` | No | Modificación. |

PK:

```text
(id)
```

FK:

```text
id → auth.users.id
```

Estados:

```text
active
suspended
deactivated
```

Check:

```text
account_status IN ('active','suspended','deactivated')
```

Índice:

```text
profiles_account_status_idx(account_status)
```

---

# 4. user_roles

```text
user_roles
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `profile_id` | `uuid` | No |
| `role` | `text` | No |
| `granted_by_profile_id` | `uuid` | Sí |
| `created_at` | `timestamptz` | No |

PK:

```text
(profile_id, role)
```

FK:

```text
profile_id → profiles.id
granted_by_profile_id → profiles.id
```

Rol inicial:

```text
admin
```

---

# 5. worker_profiles

```text
worker_profiles
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `profile_id` | `uuid` | No |
| `bio` | `text` | Sí |
| `years_experience` | `smallint` | Sí |
| `approval_status` | `text` | No |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
profile_id → profiles.id
```

Unique:

```text
UNIQUE(profile_id)
```

Estados:

```text
draft
pending_approval
approved
rejected
suspended
```

Checks:

```text
years_experience >= 0
```

```text
approval_status IN (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'suspended'
)
```

Índice:

```text
worker_profiles_approval_status_idx(approval_status)
```

---

# 6. worker_locations

```text
worker_locations
```

Relación:

```text
worker_profiles 1 → 0..1 worker_locations
```

Un worker draft puede existir sin ubicación.

La ubicación será requisito previo para envío a aprobación.

| Columna | Tipo | Nulo |
|---|---|---:|
| `worker_id` | `uuid` | No |
| `private_location` | `geography(Point,4326)` | No |
| `public_location` | `geography(Point,4326)` | Sí |
| `public_area_label` | `text` | No |
| `city` | `text` | No |
| `department` | `text` | No |
| `country_code` | `char(2)` | No |
| `service_radius_m` | `integer` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(worker_id)
```

FK:

```text
worker_id → worker_profiles.id
```

Checks:

```text
service_radius_m > 0
country_code = 'BO'
```

Índices:

```text
GIST worker_locations_private_location_gix(private_location)
GIST worker_locations_public_location_gix(public_location)
```

Regla crítica:

`private_location` nunca deberá exponerse directamente en consultas públicas.

La búsqueda pública deberá realizarse mediante función/RPC controlada basada en PostGIS.

---

# 7. service_categories

```text
service_categories
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `name` | `text` | No |
| `slug` | `text` | No |
| `icon_key` | `text` | Sí |
| `active` | `boolean` | No |
| `sort_order` | `integer` | No |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

Unique:

```text
UNIQUE(slug)
```

Checks:

```text
length(trim(name)) > 0
length(trim(slug)) > 0
sort_order >= 0
```

---

# 8. worker_services

```text
worker_services
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `category_id` | `uuid` | No |
| `title` | `text` | No |
| `description` | `text` | Sí |
| `pricing_type` | `text` | No |
| `price_bob` | `numeric(12,2)` | Sí |
| `active` | `boolean` | No |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
worker_id → worker_profiles.id
category_id → service_categories.id
```

Pricing types:

```text
hourly
daily
fixed
quote
```

Checks:

```text
pricing_type IN ('hourly','daily','fixed','quote')
```

```text
(pricing_type = 'quote' AND (price_bob IS NULL OR price_bob > 0))
OR
(pricing_type <> 'quote' AND price_bob > 0)
```

Índices:

```text
worker_services_worker_id_idx(worker_id)
worker_services_category_id_idx(category_id)
worker_services_active_idx(active)
```

---

# 9. worker_availability

```text
worker_availability
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `day_of_week` | `smallint` | No |
| `start_time` | `time` | No |
| `end_time` | `time` | No |
| `active` | `boolean` | No |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
worker_id → worker_profiles.id
```

Check:

```text
day_of_week BETWEEN 0 AND 6
end_time > start_time
```

Unique:

```text
UNIQUE(worker_id, day_of_week, start_time, end_time)
```

Índice:

```text
worker_availability_worker_day_idx(worker_id, day_of_week)
```

---

# 10. worker_portfolio_items

```text
worker_portfolio_items
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `storage_path` | `text` | No |
| `title` | `text` | Sí |
| `description` | `text` | Sí |
| `sort_order` | `integer` | No |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
worker_id → worker_profiles.id
```

Check:

```text
sort_order >= 0
```

Índice:

```text
worker_portfolio_worker_idx(worker_id)
```

---

# 11. worker_approval_requests

```text
worker_approval_requests
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `status` | `text` | No |
| `profile_snapshot` | `jsonb` | No |
| `submitted_at` | `timestamptz` | No |
| `reviewed_at` | `timestamptz` | Sí |
| `reviewed_by_profile_id` | `uuid` | Sí |
| `rejection_reason` | `text` | Sí |
| `admin_notes` | `text` | Sí |
| `created_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
worker_id → worker_profiles.id
reviewed_by_profile_id → profiles.id
```

Estados:

```text
pending
approved
rejected
```

Unique parcial previsto:

```text
UNIQUE worker_id WHERE status = 'pending'
```

Reglas:

- Solo una solicitud pendiente por trabajador.
- Rechazo requiere motivo.
- Aprobación/rechazo requiere administrador y timestamp.
- El snapshot no se sobrescribe.

---

# 12. certification_memberships

```text
certification_memberships
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `status` | `text` | No |
| `price_bob` | `numeric(12,2)` | No |
| `starts_at` | `timestamptz` | Sí |
| `expires_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
worker_id → worker_profiles.id
```

Estados:

```text
pending_payment
active
expired
cancelled
```

Checks:

```text
price_bob > 0
```

Unique parcial:

```text
UNIQUE worker_id WHERE status = 'active'
```

---

# 13. payment_transactions

```text
payment_transactions
```

En v1 los pagos corresponden únicamente a certificación.

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `payer_profile_id` | `uuid` | No |
| `certification_membership_id` | `uuid` | No |
| `amount_bob` | `numeric(12,2)` | No |
| `currency` | `char(3)` | No |
| `status` | `text` | No |
| `provider` | `text` | Sí |
| `provider_reference` | `text` | Sí |
| `paid_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
payer_profile_id → profiles.id
certification_membership_id → certification_memberships.id
```

Relación:

```text
certification_memberships 1 : N payment_transactions
```

Estados:

```text
pending
paid
failed
cancelled
refunded
```

Checks:

```text
amount_bob > 0
currency = 'BOB'
```

Índices:

```text
payment_membership_idx(certification_membership_id)
payment_payer_idx(payer_profile_id)
payment_status_idx(status)
```

---

# 14. service_requests

```text
service_requests
```

La ubicación exacta del trabajo ya NO vive en esta tabla.

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `customer_profile_id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `worker_service_id` | `uuid` | No |
| `description` | `text` | No |
| `preferred_date` | `date` | Sí |
| `preferred_time` | `time` | Sí |
| `budget_reference_bob` | `numeric(12,2)` | Sí |
| `job_area_label` | `text` | No |
| `status` | `text` | No |
| `expires_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
customer_profile_id → profiles.id
worker_id → worker_profiles.id
worker_service_id → worker_services.id
```

Estados:

```text
pending
quoted
accepted
rejected
cancelled
expired
```

Checks:

```text
length(trim(description)) > 0
budget_reference_bob IS NULL OR budget_reference_bob > 0
```

Índices:

```text
service_requests_customer_idx(customer_profile_id, created_at DESC)
service_requests_worker_idx(worker_id, status, created_at DESC)
service_requests_worker_service_idx(worker_service_id)
```

Regla adicional:

El `worker_service_id` seleccionado debe pertenecer al mismo `worker_id`.

---

# 15. service_request_locations

```text
service_request_locations
```

## Propósito

Aislar la ubicación exacta y dirección del trabajo para aplicar políticas de privacidad más estrictas.

| Columna | Tipo | Nulo |
|---|---|---:|
| `service_request_id` | `uuid` | No |
| `exact_location` | `geography(Point,4326)` | No |
| `address_text` | `text` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(service_request_id)
```

FK:

```text
service_request_id → service_requests.id
```

Índice espacial:

```text
GIST service_request_locations_exact_location_gix(exact_location)
```

Regla de seguridad:

- Cliente propietario: acceso.
- Worker antes de booking: no acceso exacto.
- Worker con booking válido: acceso según RLS/operación controlada.
- Terceros: sin acceso.

---

# 16. quotes

```text
quotes
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `service_request_id` | `uuid` | No |
| `revision_number` | `integer` | No |
| `amount_bob` | `numeric(12,2)` | No |
| `message` | `text` | Sí |
| `status` | `text` | No |
| `valid_until` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
service_request_id → service_requests.id
```

Estados:

```text
pending
accepted
rejected
withdrawn
expired
superseded
```

Unique:

```text
UNIQUE(service_request_id, revision_number)
```

Unique parcial:

```text
UNIQUE service_request_id WHERE status = 'accepted'
```

---

# 17. bookings

```text
bookings
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `service_request_id` | `uuid` | No |
| `accepted_quote_id` | `uuid` | No |
| `customer_profile_id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `service_title_snapshot` | `text` | No |
| `agreed_price_bob` | `numeric(12,2)` | No |
| `scheduled_at` | `timestamptz` | No |
| `status` | `text` | No |
| `started_at` | `timestamptz` | Sí |
| `completion_requested_at` | `timestamptz` | Sí |
| `completed_at` | `timestamptz` | Sí |
| `cancelled_at` | `timestamptz` | Sí |
| `cancelled_by_profile_id` | `uuid` | Sí |
| `cancellation_reason` | `text` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
service_request_id → service_requests.id
accepted_quote_id → quotes.id
customer_profile_id → profiles.id
worker_id → worker_profiles.id
cancelled_by_profile_id → profiles.id
```

Unique:

```text
UNIQUE(service_request_id)
UNIQUE(accepted_quote_id)
```

Estados:

```text
scheduled
in_progress
completion_pending
completed
cancelled
```

---

# 18. booking_status_history

```text
booking_status_history
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `booking_id` | `uuid` | No |
| `previous_status` | `text` | Sí |
| `new_status` | `text` | No |
| `changed_by_profile_id` | `uuid` | Sí |
| `note` | `text` | Sí |
| `created_at` | `timestamptz` | No |

FK:

```text
booking_id → bookings.id
changed_by_profile_id → profiles.id
```

Índice:

```text
booking_status_history_booking_idx(booking_id, created_at)
```

---

# 19. reviews

```text
reviews
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `booking_id` | `uuid` | No |
| `rating` | `smallint` | No |
| `comment` | `text` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
booking_id → bookings.id
```

Unique:

```text
UNIQUE(booking_id)
```

Check:

```text
rating BETWEEN 1 AND 5
```

La creación requiere booking `completed`.

---

# 20. favorites

```text
favorites
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `profile_id` | `uuid` | No |
| `worker_id` | `uuid` | No |
| `created_at` | `timestamptz` | No |

PK:

```text
(profile_id, worker_id)
```

FK:

```text
profile_id → profiles.id
worker_id → worker_profiles.id
```

---

# 21. conversations

```text
conversations
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `service_request_id` | `uuid` | No |
| `status` | `text` | No |
| `closed_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

FK:

```text
service_request_id → service_requests.id
```

Unique:

```text
UNIQUE(service_request_id)
```

Estados:

```text
active
closed
```

---

# 22. messages

```text
messages
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `conversation_id` | `uuid` | No |
| `sender_profile_id` | `uuid` | Sí |
| `message_type` | `text` | No |
| `content` | `text` | No |
| `read_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |

FK:

```text
conversation_id → conversations.id
sender_profile_id → profiles.id
```

Tipos:

```text
text
system
```

---

# 23. notifications

```text
notifications
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `profile_id` | `uuid` | No |
| `type` | `text` | No |
| `title` | `text` | No |
| `body` | `text` | No |
| `related_entity_type` | `text` | Sí |
| `related_entity_id` | `uuid` | Sí |
| `read_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |

FK:

```text
profile_id → profiles.id
```

---

# 24. device_push_tokens

```text
device_push_tokens
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `profile_id` | `uuid` | No |
| `token` | `text` | No |
| `platform` | `text` | No |
| `device_id` | `text` | Sí |
| `last_seen_at` | `timestamptz` | No |
| `revoked_at` | `timestamptz` | Sí |
| `created_at` | `timestamptz` | No |

FK:

```text
profile_id → profiles.id
```

Unique:

```text
UNIQUE(token)
```

---

# 25. user_reports

```text
user_reports
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `uuid` | No |
| `reporter_profile_id` | `uuid` | No |
| `reported_profile_id` | `uuid` | No |
| `booking_id` | `uuid` | Sí |
| `reason` | `text` | No |
| `description` | `text` | No |
| `status` | `text` | No |
| `reviewed_by_profile_id` | `uuid` | Sí |
| `reviewed_at` | `timestamptz` | Sí |
| `resolution_notes` | `text` | Sí |
| `created_at` | `timestamptz` | No |
| `updated_at` | `timestamptz` | No |

FK:

```text
reporter_profile_id → profiles.id
reported_profile_id → profiles.id
booking_id → bookings.id
reviewed_by_profile_id → profiles.id
```

Estados:

```text
open
under_review
resolved
dismissed
```

Check:

```text
reporter_profile_id <> reported_profile_id
```

---

# 26. audit_logs

```text
audit_logs
```

| Columna | Tipo | Nulo |
|---|---|---:|
| `id` | `bigint generated always as identity` | No |
| `actor_profile_id` | `uuid` | Sí |
| `action` | `text` | No |
| `entity_type` | `text` | No |
| `entity_id` | `uuid` | Sí |
| `metadata` | `jsonb` | No |
| `created_at` | `timestamptz` | No |

PK:

```text
(id)
```

FK:

```text
actor_profile_id → profiles.id
```

Append-only.

Usuarios normales no podrán insertar, actualizar o borrar logs arbitrariamente.

---

# 27. Función/RPC prevista para búsqueda geográfica

La aplicación móvil no consultará `private_location` directamente.

Se implementará una operación controlada similar a:

```text
search_nearby_workers(
  latitude,
  longitude,
  radius_m,
  category_id,
  availability_filter
)
```

Internamente:

- filtra `worker_profiles.approval_status = 'approved'`;
- filtra servicios activos;
- usa PostGIS sobre `worker_locations.private_location`;
- calcula distancia;
- aplica radio;
- devuelve únicamente información pública segura.

Salida conceptual:

```text
worker_id
profile_id
display_name
avatar_path
public_area_label
public_location
distance_m
service_id
service_title
price_bob
average_rating
review_count
is_certified
```

`is_certified` es derivado, no almacenado.

---

# 28. Relaciones resumidas

```text
auth.users
    │
    ▼
profiles
    │
    ├── user_roles
    └── worker_profiles
            │
            ├── worker_locations (0..1)
            ├── worker_services
            ├── worker_availability
            ├── worker_portfolio_items
            ├── worker_approval_requests
            └── certification_memberships
                    └── payment_transactions

profiles
    │
    └── service_requests
            │
            ├── service_request_locations
            ├── quotes
            ├── conversation
            │      └── messages
            └── booking
                   ├── booking_status_history
                   └── review

profiles ── favorites ── worker_profiles

profiles ── notifications
profiles ── device_push_tokens

profiles ── user_reports
bookings ── user_reports

profiles ── audit_logs
```

---

# 29. Operaciones que deberán ser transaccionales

## Enviar perfil a revisión

Debe:

1. Validar perfil completo.
2. Validar que exista `worker_locations`.
3. Crear snapshot.
4. Crear `worker_approval_requests`.
5. Cambiar `approval_status`.
6. Ejecutarse atómicamente.

## Aprobar trabajador

Debe:

1. Validar solicitud pendiente.
2. Actualizar historial.
3. Cambiar estado actual.
4. Crear audit log.
5. Crear notificación.
6. Ejecutarse atómicamente.

## Crear solicitud

Debe:

1. Verificar worker aprobado.
2. Verificar servicio activo.
3. Verificar pertenencia del servicio.
4. Crear `service_requests`.
5. Crear `service_request_locations`.
6. Crear `conversations`.
7. Crear notificación.
8. Ejecutarse atómicamente.

## Aceptar cotización

Debe:

1. Validar cotización.
2. Marcar cotización aceptada.
3. Actualizar solicitud.
4. Crear booking.
5. Crear primer status history.
6. Crear notificaciones.
7. Ejecutarse atómicamente.

## Cambios de booking

Deben:

- validar actor;
- validar transición;
- actualizar booking;
- crear status history;
- crear notificación cuando corresponda.

## Crear review

Debe validar:

```text
booking.status = completed
```

y que el usuario autenticado sea el cliente.

## Activar certificación

Debe validar:

- trabajador aprobado;
- pago confirmado;
- no duplicidad de membership activa.

---

# 30. Consideraciones RLS aprobadas

## profiles

Usuario puede consultar/modificar su propio perfil.

## worker_profiles

Consulta pública solo para trabajadores aprobados mediante vistas/funciones seguras.

## worker_locations

Sin SELECT público directo sobre `private_location`.

## service_request_locations

Acceso altamente restringido.

## worker_services

Trabajador gestiona solo los suyos.

## worker_approval_requests

Worker ve sus solicitudes; admin revisa.

## service_requests

Solo cliente propietario y worker destinatario.

## quotes

Solo participantes autorizados.

## bookings

Solo cliente, worker y admin autorizado.

## reviews

Lectura pública; escritura solo desde booking completado por cliente participante.

## conversations / messages

Solo participantes y moderación autorizada.

## notifications

Solo receptor.

## user_reports

Reporter ve información limitada; admin controla revisión.

## audit_logs

Acceso restringido.

---

# 31. Datos derivados

No serán almacenados como fuente canónica:

```text
is_certified
average_rating
review_count
distance_from_customer
```

Se derivarán mediante consultas, funciones o vistas.

---

# 32. Orden previsto de migraciones

```text
01_extensions
02_profiles
03_user_roles
04_worker_profiles
05_worker_locations
06_service_categories
07_worker_services
08_worker_availability
09_worker_portfolio
10_worker_approval
11_certification_memberships
12_payment_transactions
13_service_requests
14_service_request_locations
15_quotes
16_bookings
17_booking_status_history
18_reviews
19_favorites
20_conversations
21_messages
22_notifications
23_device_push_tokens
24_user_reports
25_audit_logs
26_database_functions
27_rls_policies
28_seed_data
```

Todavía no deben crearse.

---

# 33. Decisiones pendientes

Permanecen pendientes y deberán resolverse antes de implementar sus módulos:

1. Duración de certificación.
2. Renovación.
3. Requisitos exactos del badge certificado.
4. Proveedor de pagos.
5. Estrategia exacta de `public_location`.
6. Radio mínimo/máximo.
7. Campos obligatorios para enviar a aprobación.
8. Estructura definitiva de `profile_snapshot`.
9. Política de cancelaciones.
10. Disputas.
11. No-show.
12. Eliminación/anominización de cuentas.
13. Retención de mensajes.
14. Retención de audit logs.
15. Proveedor de push.
16. Moderación final de reviews.

---

# 34. Regla de congelamiento

A partir de este documento:

- No se agregarán tablas sin decisión explícita.
- No se cambiarán relaciones aprobadas sin actualizar documentación.
- Cambios arquitectónicos relevantes deberán justificarse con ADR.
- Codex deberá consultar este documento antes de modificar el modelo.
- Las futuras migraciones deberán ser reproducibles.
- Ningún cambio directo en Supabase sustituirá una migración versionada.

---

# 35. Próximo paso

El próximo paso será realizar el primer commit oficial del repositorio y abrir formalmente el proyecto en Codex.

A partir de ese punto, Codex utilizará:

```text
AGENTS.md
docs/00-project/
docs/01-requirements/
docs/02-architecture/
docs/03-database/
```

como conocimiento persistente del proyecto antes de implementar código.
