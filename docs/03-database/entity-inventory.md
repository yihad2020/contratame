# Contrátame! — Inventario de Entidades

## 1. Objetivo

Este documento identifica las entidades principales del sistema Contrátame! antes de diseñar el modelo entidad-relación y el esquema físico de PostgreSQL.

En esta etapa no se definen todavía todas las columnas, tipos de datos, índices o políticas RLS.

El objetivo es establecer:

- Qué entidades existen.
- Qué responsabilidad tiene cada una.
- Qué relaciones conceptuales existen entre ellas.
- Qué entidades forman parte del MVP.
- Qué elementos todavía requieren decisiones de negocio.

---

# 2. Principio general de modelado

Contrátame! utilizará Supabase Auth para autenticación.

Por lo tanto:

`auth.users`

será la fuente principal de identidad y autenticación.

No se creará una segunda tabla que duplique:

- Contraseña.
- Credenciales.
- Tokens.
- Estado interno de autenticación.

La información de negocio del usuario se almacenará en tablas propias del sistema.

Relación conceptual:

```text
auth.users
     │
     ▼
profiles
```

---

# 3. Entidades principales del MVP

## 3.1 Profile

**Nombre lógico:** Perfil de usuario

**Nombre previsto en base de datos:** `profiles`

Representa la información general de una persona registrada en Contrátame!.

Puede corresponder a:

- Cliente.
- Trabajador.
- Administrador.

Responsabilidades:

- Datos generales del usuario.
- Nombre.
- Apellido.
- Teléfono.
- Fotografía.
- Rol dentro de la plataforma.
- Estado general de la cuenta.

Relación principal:

```text
auth.users
     │
     │ 1 : 1
     ▼
profiles
```

---

## 3.2 Worker Profile

**Nombre lógico:** Perfil profesional del trabajador

**Nombre previsto:** `worker_profiles`

Contiene la información exclusivamente relacionada con un trabajador independiente.

Responsabilidades:

- Descripción profesional.
- Experiencia.
- Zona de trabajo.
- Radio de servicio.
- Estado de publicación.
- Información profesional adicional.

Relación:

```text
profiles
   │
   │ 1 : 0..1
   ▼
worker_profiles
```

Un usuario cliente no necesita un `worker_profile`.

---

## 3.3 Service Category

**Nombre lógico:** Categoría de servicio

**Nombre previsto:** `service_categories`

Representa categorías generales disponibles en la plataforma.

Ejemplos:

- Electricidad.
- Plomería.
- Carpintería.
- Construcción.
- Limpieza.
- Jardinería.
- Pintura.
- Mecánica.

Las categorías serán administradas por Contrátame!.

---

## 3.4 Worker Service

**Nombre lógico:** Servicio ofrecido por trabajador

**Nombre previsto:** `worker_services`

Representa un servicio específico que un trabajador ofrece.

Ejemplo:

```text
Categoría:
Electricidad

Servicio:
Instalación de luminarias

Trabajador:
Carlos Mendoza

Precio:
Bs 100
```

Un trabajador podrá ofrecer múltiples servicios.

Una categoría podrá ser utilizada por múltiples trabajadores.

Relación conceptual:

```text
worker_profiles
       │
       │ 1 : N
       ▼
worker_services
       │
       │ N : 1
       ▼
service_categories
```

---

## 3.5 Worker Availability

**Nombre lógico:** Disponibilidad del trabajador

**Nombre previsto:** `worker_availability`

Representa los días y horarios en los que el trabajador normalmente está disponible.

Ejemplo:

```text
Lunes
08:00 - 18:00

Martes
08:00 - 18:00
```

Un trabajador podrá tener múltiples bloques de disponibilidad.

---

## 3.6 Worker Portfolio Item

**Nombre lógico:** Elemento de portafolio

**Nombre previsto:** `worker_portfolio_items`

Representa trabajos anteriores publicados por un trabajador.

Podrá contener:

- Imagen.
- Título.
- Descripción.

Las imágenes se almacenarán físicamente en Supabase Storage.

La base de datos almacenará referencias hacia los archivos.

Relación:

```text
worker_profiles
       │
       │ 1 : N
       ▼
worker_portfolio_items
```

---

## 3.7 Worker Approval Request

**Nombre lógico:** Solicitud de aprobación de trabajador

**Nombre previsto:** `worker_approval_requests`

Representa cada vez que un trabajador envía su perfil para revisión administrativa.

Permite conservar historial y trazabilidad.

Ejemplo:

```text
Solicitud #1
→ Rechazada

Trabajador corrige perfil

Solicitud #2
→ Aprobada
```

Debe permitir identificar:

- Trabajador.
- Fecha de envío.
- Estado.
- Administrador responsable.
- Fecha de revisión.
- Motivo de rechazo.
- Observaciones administrativas.

Relación conceptual:

```text
worker_profiles
       │
       │ 1 : N
       ▼
worker_approval_requests
```

El historial no deberá sobrescribirse cuando exista una nueva solicitud.

---

## 3.8 Certification Membership

**Nombre lógico:** Membresía de certificación

**Nombre previsto:** `certification_memberships`

Representa la certificación opcional de un trabajador.

Reglas actuales:

- Es opcional.
- Tiene un precio planteado de Bs 50.
- Solo puede generar una insignia visible para trabajadores aprobados.
- Es independiente de la aprobación administrativa.

La duración y renovación todavía están pendientes de definición.

Relación:

```text
worker_profiles
       │
       │ 1 : N
       ▼
certification_memberships
```

Se mantiene una relación histórica para permitir futuras renovaciones.

---

## 3.9 Service Request

**Nombre lógico:** Solicitud de servicio

**Nombre previsto:** `service_requests`

Representa una necesidad publicada o enviada por un cliente.

Ejemplo:

```text
Cliente:
Necesito reparar una fuga de agua.

Categoría:
Plomería

Zona:
Equipetrol

Fecha preferida:
12/10/2026
```

Podrá contener:

- Cliente.
- Categoría.
- Descripción.
- Ubicación.
- Fecha preferida.
- Presupuesto cuando corresponda.
- Estado.

---

## 3.10 Quote

**Nombre lógico:** Cotización

**Nombre previsto:** `quotes`

Representa una propuesta económica enviada por un trabajador para una solicitud.

Podrá incluir:

- Trabajador.
- Solicitud.
- Precio.
- Mensaje.
- Estado.
- Vigencia.

Relación conceptual:

```text
service_requests
       │
       │ 1 : N
       ▼
quotes
```

Una solicitud podrá potencialmente recibir más de una cotización.

---

## 3.11 Booking

**Nombre lógico:** Contratación / Reserva

**Nombre previsto:** `bookings`

Representa el acuerdo formal dentro de Contrátame! entre un cliente y un trabajador.

Se crea una vez que existe una contratación aceptada.

Podrá representar estados como:

```text
scheduled
in_progress
completed
cancelled
```

Relacionará:

- Cliente.
- Trabajador.
- Solicitud.
- Cotización aceptada cuando exista.
- Fecha programada.
- Precio acordado.
- Estado.

---

## 3.12 Review

**Nombre lógico:** Calificación y reseña

**Nombre previsto:** `reviews`

Representa la evaluación realizada después de un servicio.

Una reseña deberá estar relacionada con una contratación válida.

Relación conceptual:

```text
bookings
   │
   │ 1 : 0..1
   ▼
reviews
```

La política inicial será evitar reseñas de personas que no hayan completado una contratación.

---

## 3.13 Favorite

**Nombre lógico:** Profesional favorito

**Nombre previsto:** `favorites`

Permite que un cliente guarde un trabajador para encontrarlo nuevamente.

Relación conceptual:

```text
customer profile
      │
      │ N : N
      ▼
worker profile
```

La tabla `favorites` resolverá esta relación.

---

## 3.14 Conversation

**Nombre lógico:** Conversación

**Nombre previsto:** `conversations`

Representa un canal de comunicación entre usuarios.

En el MVP, estará principalmente relacionado con:

- Cliente.
- Trabajador.
- Solicitud o contratación cuando corresponda.

---

## 3.15 Message

**Nombre lógico:** Mensaje

**Nombre previsto:** `messages`

Representa cada mensaje enviado dentro de una conversación.

Relación:

```text
conversations
      │
      │ 1 : N
      ▼
messages
```

---

## 3.16 Notification

**Nombre lógico:** Notificación

**Nombre previsto:** `notifications`

Representa eventos relevantes comunicados a un usuario.

Ejemplos:

- Perfil aprobado.
- Perfil rechazado.
- Nueva solicitud.
- Nueva cotización.
- Nuevo mensaje.
- Servicio aceptado.
- Servicio próximo.
- Nueva calificación.

---

## 3.17 User Report

**Nombre lógico:** Reporte de usuario o contenido

**Nombre previsto:** `user_reports`

Permite reportar:

- Trabajadores.
- Clientes.
- Comportamiento inapropiado.
- Contenido.
- Problemas ocurridos durante un servicio.

El reporte será revisado desde el panel administrativo.

---

## 3.18 Audit Log

**Nombre lógico:** Registro de auditoría

**Nombre previsto:** `audit_logs`

Permitirá registrar acciones administrativas o sensibles.

Ejemplos:

- Administrador aprobó trabajador.
- Administrador rechazó trabajador.
- Cuenta suspendida.
- Certificación activada.
- Reporte resuelto.

Su objetivo es proporcionar trazabilidad.

---

# 4. Entidades relacionadas con ubicación

La geolocalización requiere tratamiento especial debido a privacidad y PostGIS.

Actualmente existen dos posibilidades.

## Opción A

Mantener la ubicación de servicio dentro de:

`worker_profiles`

## Opción B

Crear una entidad independiente:

`worker_locations`

Una entidad independiente permitiría:

- Separar información privada y pública.
- Manejar actualización de ubicación.
- Aplicar controles de acceso específicos.
- Evolucionar hacia múltiples zonas de servicio.

La decisión todavía no está cerrada.

Debe resolverse antes de diseñar el esquema físico definitivo.

---

# 5. Entidades relacionadas con pagos

El sistema tendrá inicialmente un pago asociado a la certificación de Bs 50.

Es probable que sea necesaria una entidad:

`payments`

Sin embargo, todavía no se encuentra definido:

- Proveedor de pago.
- Duración de certificación.
- Renovación.
- Reembolsos.
- Estados definitivos de pago.
- Integración técnica.

Por esta razón, la entidad `payments` se considera prevista pero no finalizada.

No deberá diseñarse en detalle hasta formalizar el proceso de certificación.

---

# 6. Entidades que NO se crearán inicialmente

## Customer Profile separado

Inicialmente no se considera necesaria una tabla:

`customer_profiles`

La información general del cliente podrá residir en:

`profiles`

Si posteriormente aparecen datos exclusivos y significativos para clientes, esta decisión podrá revisarse mediante un ADR.

---

## Admin Profile separado

Inicialmente no se considera necesaria una tabla:

`admin_profiles`

El rol administrativo se podrá representar mediante el perfil general y las reglas de autorización.

---

## Credentials

No se creará:

`credentials`

ni tablas equivalentes para almacenar contraseñas.

Supabase Auth administrará las credenciales.

---

# 7. Relaciones conceptuales principales

Vista simplificada:

```text
auth.users
    │
    ▼
profiles
    │
    ├───────────────────────────────┐
    │                               │
    │ role = customer               │ role = worker
    │                               │
    │                               ▼
    │                         worker_profiles
    │                               │
    │                ┌──────────────┼───────────────┐
    │                │              │               │
    │                ▼              ▼               ▼
    │        worker_services   availability      portfolio
    │                │
    │                ▼
    │       service_categories
    │
    │
    ├──────────────► service_requests
    │                     │
    │                     ▼
    │                   quotes
    │                     │
    │                     ▼
    └──────────────────► bookings
                          │
                          ▼
                        reviews
```

Procesos adicionales del trabajador:

```text
worker_profiles
      │
      ├── worker_approval_requests
      │
      └── certification_memberships
```

Comunicación:

```text
profiles
   │
   ▼
conversations
   │
   ▼
messages
```

---

# 8. Inventario preliminar

Entidades consideradas parte del núcleo:

1. `profiles`
2. `worker_profiles`
3. `service_categories`
4. `worker_services`
5. `worker_availability`
6. `worker_portfolio_items`
7. `worker_approval_requests`
8. `certification_memberships`
9. `service_requests`
10. `quotes`
11. `bookings`
12. `reviews`
13. `favorites`
14. `conversations`
15. `messages`
16. `notifications`
17. `user_reports`
18. `audit_logs`

Entidades pendientes de decisión:

19. `worker_locations`
20. `payments`

Entidad externa administrada por Supabase:

21. `auth.users`

---

# 9. Decisiones pendientes antes del ERD definitivo

Antes de finalizar el modelo entidad-relación deberán resolverse:

1. Modelo exacto de ubicación del trabajador.
2. Diferencia entre ubicación privada y zona pública.
3. Duración de la certificación.
4. Renovación de la certificación.
5. Proveedor y flujo de pago.
6. Si una solicitud se envía a un trabajador específico o puede publicarse para varios trabajadores.
7. Si múltiples trabajadores pueden cotizar una misma solicitud.
8. Política de cancelaciones.
9. Política de reseñas.
10. Reglas de comunicación antes y después de una contratación.
11. Estados definitivos de solicitudes.
12. Estados definitivos de cotizaciones.
13. Estados definitivos de reservas.
14. Datos requeridos para aprobación administrativa.
15. Datos adicionales requeridos para certificación.

Estas decisiones deben resolverse antes de convertir el inventario conceptual en un esquema físico definitivo.
