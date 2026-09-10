# Contrátame! — Inventario de Entidades

## Estado del documento

**Estado:** Alineado con el modelo APPROVED / FROZEN

**Fuentes autoritativas:** `conceptual-erd-v1.md` y `logical-schema-v1.md`

**SQL implementado:** No

**Migraciones creadas:** No

Este documento resume las entidades realmente definidas en el modelo conceptual y el esquema lógico congelados de Contrátame!.

El inventario aprobado contiene:

```text
24 entidades propias de Contrátame!
+
1 entidad externa administrada por Supabase
=
25 entidades totales
```

No se agregarán entidades ni se modificarán relaciones desde este inventario. Cualquier cambio estructural deberá actualizar primero los documentos autoritativos y, cuando corresponda, documentarse mediante un ADR.

---

# 1. Principios generales de modelado

## 1.1 Identidad y autenticación

Supabase Auth administra la identidad mediante:

`auth.users`

Cada identidad autenticada tiene exactamente un perfil general:

```text
auth.users
    │
    │ 1 : 1
    ▼
profiles
```

Contrátame! no almacena contraseñas ni duplica credenciales, tokens o el estado interno de autenticación.

## 1.2 Cliente como capacidad por defecto

Todo usuario registrado puede utilizar la plataforma como cliente. No existe una entidad `customer_profiles` en el modelo aprobado.

Un usuario se convierte adicionalmente en trabajador cuando crea un perfil profesional:

```text
profiles
   │
   │ 1 : 0..1
   ▼
worker_profiles
```

## 1.3 Roles privilegiados

Los permisos administrativos se representan mediante `user_roles`. Cliente y trabajador no se modelan como roles mutuamente excluyentes.

```text
profiles
   │
   │ 1 : 0..N
   ▼
user_roles
```

---

# 2. Usuarios

## 2.1 profiles

Representa la información general de una persona registrada en Contrátame! y mantiene una relación 1:1 con `auth.users`.

Responsabilidades principales:

- Nombre y apellido.
- Teléfono.
- Referencia a fotografía de perfil en Storage.
- Estado general de la cuenta.

Estados aprobados de cuenta:

```text
active
suspended
deactivated
```

## 2.2 user_roles

Representa permisos privilegiados asociados a un perfil. El rol inicial definido es:

```text
admin
```

Un perfil puede tener cero o varios registros de rol. La entidad conserva quién concedió el permiso cuando corresponda.

---

# 3. Trabajadores

## 3.1 worker_profiles

Representa la información profesional adicional de un usuario que ofrece servicios.

Responsabilidades principales:

- Descripción profesional.
- Años de experiencia.
- Estado actual de aprobación y publicación.

Estados aprobados:

```text
draft
pending_approval
approved
rejected
suspended
```

Un perfil puede tener como máximo un registro en `worker_profiles`. Solo los trabajadores con estado `approved` pueden aparecer públicamente.

## 3.2 worker_locations

Separa la geolocalización profesional del resto del perfil del trabajador.

Relación:

```text
worker_profiles
      │
      │ 1 : 0..1
      ▼
worker_locations
```

La ubicación puede faltar mientras el perfil está en `draft`, pero es obligatoria antes de enviarlo a aprobación.

Responsabilidades principales:

- Ubicación privada exacta.
- Ubicación pública aproximada opcional.
- Etiqueta pública de zona.
- Ciudad y departamento.
- País, restringido inicialmente a Bolivia.
- Radio de servicio.

`private_location` no se expone mediante consultas públicas. La búsqueda geográfica debe usar una operación controlada con PostGIS que devuelva únicamente información pública segura.

## 3.3 worker_services

Representa cada servicio concreto ofrecido por un trabajador.

Cada registro pertenece a:

- Un `worker_profiles`.
- Una `service_categories`.

Los tipos de precio aprobados son:

```text
hourly
daily
fixed
quote
```

## 3.4 worker_availability

Representa bloques recurrentes de disponibilidad de un trabajador, definidos por día de la semana y horario de inicio y fin.

Relación:

```text
worker_profiles 1 : N worker_availability
```

## 3.5 worker_portfolio_items

Representa trabajos anteriores publicados por un trabajador.

Las imágenes se almacenan en Supabase Storage y la base de datos conserva la ruta junto con título, descripción y orden cuando corresponda.

Relación:

```text
worker_profiles 1 : N worker_portfolio_items
```

---

# 4. Catálogo

## 4.1 service_categories

Representa las categorías generales de servicios administradas por Contrátame!, por ejemplo electricidad, plomería, carpintería, limpieza o mecánica.

Una categoría puede clasificar múltiples `worker_services`.

```text
service_categories 1 : N worker_services
```

---

# 5. Aprobación administrativa

## 5.1 worker_approval_requests

Representa cada envío de un perfil profesional a revisión administrativa y conserva el historial sin sobrescribir solicitudes anteriores.

Relación:

```text
worker_profiles 1 : N worker_approval_requests
```

Estados aprobados de la solicitud:

```text
pending
approved
rejected
```

Reglas estructurales principales:

- Solo puede existir una solicitud pendiente por trabajador.
- Cada solicitud conserva un `profile_snapshot`.
- Un rechazo requiere motivo.
- Aprobar o rechazar requiere administrador responsable y fecha de revisión.
- El estado actual de publicación permanece en `worker_profiles.approval_status`.

---

# 6. Certificación y pagos

## 6.1 certification_memberships

Representa el historial de certificaciones opcionales de un trabajador.

La certificación es independiente de la aprobación administrativa, tiene un precio inicial planteado de Bs 50 y solo puede producir una insignia visible para un trabajador aprobado.

Relación:

```text
worker_profiles 1 : N certification_memberships
```

Estados aprobados:

```text
pending_payment
active
expired
cancelled
```

Solo puede existir una membresía activa por trabajador. La insignia certificada es un dato derivado de un trabajador aprobado y una membresía activa; no es un booleano canónico almacenado en `worker_profiles`.

## 6.2 payment_transactions

Representa los intentos de pago asociados a una membresía de certificación. En la versión 1, los pagos modelados corresponden únicamente a certificación.

Relación aprobada:

```text
certification_memberships
      │
      │ 1 : N
      ▼
payment_transactions
```

Una membresía puede tener múltiples intentos de pago. Cada transacción también identifica al perfil pagador.

Estados aprobados:

```text
pending
paid
failed
cancelled
refunded
```

La entidad y su relación están aprobadas aunque el proveedor de pagos siga pendiente de definición.

---

# 7. Solicitudes, cotizaciones y contratación

## 7.1 service_requests

Representa una solicitud directa enviada por un cliente a un trabajador específico por uno de los servicios que ese trabajador ofrece.

El MVP no utiliza un mercado abierto donde varios trabajadores compiten por una misma solicitud.

Cada solicitud pertenece a:

- Un cliente mediante `profiles`.
- Un trabajador mediante `worker_profiles`.
- Un servicio mediante `worker_services`.

El servicio seleccionado debe pertenecer al mismo trabajador destinatario.

Estados aprobados:

```text
pending
quoted
accepted
rejected
cancelled
expired
```

La tabla conserva una etiqueta aproximada de la zona del trabajo, pero no su ubicación exacta.

## 7.2 service_request_locations

Aísla la ubicación exacta y la dirección sensible del trabajo respecto de la información general de `service_requests`.

Relación aprobada:

```text
service_requests
      │
      │ 1 : 1
      ▼
service_request_locations
```

Reglas de acceso conceptuales:

- El cliente propietario puede acceder.
- El trabajador no accede a la ubicación exacta antes del booking.
- El trabajador con un booking válido puede acceder según RLS u operación controlada.
- Terceros no tienen acceso.

## 7.3 quotes

Representa las revisiones históricas de cotización para una solicitud.

Relación:

```text
service_requests 1 : N quotes
```

Estados aprobados:

```text
pending
accepted
rejected
withdrawn
expired
superseded
```

Cada revisión tiene un número único dentro de su solicitud y solo una cotización puede quedar aceptada por solicitud.

## 7.4 bookings

Representa la contratación creada cuando una cotización es aceptada.

Relaciones principales:

```text
service_requests 1 : 0..1 bookings
quotes           1 : 0..1 bookings
```

Cada booking conserva el cliente, el trabajador, el servicio acordado, el precio acordado y la fecha programada como información histórica.

Estados aprobados:

```text
scheduled
in_progress
completion_pending
completed
cancelled
```

## 7.5 booking_status_history

Registra los cambios de estado de un booking sin reemplazar su historial.

Relación:

```text
bookings 1 : N booking_status_history
```

Conserva el estado anterior, el nuevo estado, el actor, una nota opcional y la fecha del cambio.

---

# 8. Reputación y favoritos

## 8.1 reviews

Representa la calificación del trabajador realizada por el cliente después del servicio.

Relación:

```text
bookings 1 : 0..1 reviews
```

Reglas aprobadas para el MVP:

- Solo el cliente participante puede crearla.
- El booking debe estar `completed`.
- Solo existe una reseña por booking.
- La calificación está entre 1 y 5.
- El promedio y el número de reseñas son datos derivados.

## 8.2 favorites

Representa el marcador privado de un trabajador guardado por un perfil.

```text
profiles ── favorites ── worker_profiles
```

No crea conversaciones, solicitudes o bookings; tampoco notifica al trabajador. La combinación de perfil y trabajador no puede duplicarse.

---

# 9. Comunicación y notificaciones

## 9.1 conversations

Representa una conversación vinculada a una solicitud real de servicio.

Relación:

```text
service_requests 1 : 0..1 conversations
```

Estados aprobados:

```text
active
closed
```

Una conversación cerrada permanece legible, pero no acepta nuevos mensajes.

## 9.2 messages

Representa cada mensaje dentro de una conversación.

```text
conversations 1 : N messages
```

Tipos iniciales:

```text
text
system
```

## 9.3 notifications

Representa notificaciones internas dirigidas a un perfil por eventos relevantes de la plataforma.

```text
profiles 1 : N notifications
```

Las notificaciones internas constituyen el registro; una notificación push es únicamente un mecanismo externo de entrega.

## 9.4 device_push_tokens

Representa los tokens de dispositivos registrados por un perfil para la entrega de notificaciones push.

```text
profiles 1 : N device_push_tokens
```

Cada token es único y puede revocarse.

---

# 10. Moderación y auditoría

## 10.1 user_reports

Representa un reporte creado por un perfil sobre otro perfil, con un booking opcional como contexto.

Estados aprobados:

```text
open
under_review
resolved
dismissed
```

El perfil que reporta debe ser diferente del perfil reportado. Un reporte no produce una sanción automática y su revisión corresponde a administración.

## 10.2 audit_logs

Registra acciones administrativas o sensibles, como aprobaciones, rechazos, suspensiones, activaciones de certificación y resolución de reportes.

Los registros son append-only. Los usuarios normales no pueden insertarlos, actualizarlos o eliminarlos arbitrariamente.

---

# 11. Relaciones conceptuales resumidas

```text
auth.users
    │
    │ 1 : 1
    ▼
profiles
    │
    ├── user_roles
    └── worker_profiles (0..1)
            │
            ├── worker_locations (0..1)
            ├── worker_services
            │       └── service_categories
            ├── worker_availability
            ├── worker_portfolio_items
            ├── worker_approval_requests
            └── certification_memberships
                    └── payment_transactions

profiles
    │
    └── service_requests
            ├── service_request_locations (1:1)
            ├── quotes
            ├── conversations
            │       └── messages
            └── bookings
                    ├── booking_status_history
                    └── reviews

profiles ── favorites ── worker_profiles
profiles ── notifications
profiles ── device_push_tokens
profiles ── user_reports
bookings ── user_reports
profiles ── audit_logs
```

---

# 12. Inventario aprobado y congelado

## Entidad externa administrada por Supabase

1. `auth.users`

## Entidades propias de Contrátame!

### Usuarios

1. `profiles`
2. `user_roles`

### Trabajadores

3. `worker_profiles`
4. `worker_locations`
5. `worker_services`
6. `worker_availability`
7. `worker_portfolio_items`

### Catálogo

8. `service_categories`

### Aprobación

9. `worker_approval_requests`

### Certificación

10. `certification_memberships`
11. `payment_transactions`

### Marketplace

12. `service_requests`
13. `service_request_locations`
14. `quotes`
15. `bookings`
16. `booking_status_history`

### Reputación

17. `reviews`
18. `favorites`

### Comunicación

19. `conversations`
20. `messages`
21. `notifications`
22. `device_push_tokens`

### Moderación y auditoría

23. `user_reports`
24. `audit_logs`

Total:

```text
24 entidades propias
+
1 entidad externa
=
25 entidades totales
```

---

# 13. Entidades que no se crearán inicialmente

## customer_profiles

No se creará una tabla separada para clientes. Todo `profiles` tiene capacidad de cliente por defecto.

## admin_profiles

No se creará una tabla separada para administradores. Los permisos privilegiados se representan mediante `user_roles`.

## credentials

No se crearán tablas propias para contraseñas, tokens de autenticación o credenciales. Supabase Auth administra esa información.

---

# 14. Decisiones de negocio todavía pendientes

Las siguientes decisiones permanecen pendientes y deberán resolverse antes de implementar los módulos afectados:

1. Duración exacta de la certificación.
2. Política de renovación de la certificación.
3. Requisitos exactos para obtener y mostrar el badge certificado.
4. Proveedor y flujo definitivo de pagos.
5. Estrategia exacta para generar `public_location`.
6. Radio mínimo y máximo permitido.
7. Campos obligatorios para enviar un perfil a aprobación.
8. Estructura definitiva de `profile_snapshot`.
9. Política detallada de cancelaciones.
10. Política de disputas.
11. Política de no-show.
12. Política de eliminación o anonimización de cuentas.
13. Retención de mensajes.
14. Retención de audit logs.
15. Proveedor definitivo de notificaciones push.
16. Política final de moderación de reseñas.

Estas decisiones pendientes no alteran el inventario estructural congelado. No deben resolverse mediante suposiciones durante la implementación.

---

# 15. Regla de alineación

- `conceptual-erd-v1.md` y `logical-schema-v1.md` son las fuentes autoritativas del modelo congelado.
- Este inventario debe permanecer consistente con las entidades y relaciones definidas en esos documentos.
- No se agregarán entidades ni se cambiarán cardinalidades sin una decisión explícita y la actualización documental correspondiente.
- Las futuras migraciones deberán ser reproducibles y respetar el esquema lógico aprobado.
