# Contrátame! — Arquitectura del Sistema

## 1. Objetivo

Este documento define la arquitectura técnica inicial del sistema Contrátame!.

La arquitectura busca cumplir cuatro objetivos principales:

1. Permitir desarrollar el MVP dentro del plazo académico de seis meses.
2. Mantener una estructura modular y escalable.
3. Facilitar la documentación y trazabilidad del proyecto.
4. Evitar complejidad técnica innecesaria.

La arquitectura adoptará inicialmente un enfoque de **monolito modular**, donde las responsabilidades del sistema estarán separadas por dominios funcionales, pero sin utilizar microservicios independientes.

---

## 2. Vista general

Contrátame! estará compuesto inicialmente por tres componentes principales:

1. Aplicación móvil.
2. Backend y base de datos.
3. Panel administrativo web.

También existirán servicios externos para funciones específicas como mapas, geolocalización, notificaciones y pagos.

Vista conceptual:

```text
┌─────────────────────────────────────────────┐
│                  CONTRÁTAME!                │
└─────────────────────────────────────────────┘

        ┌───────────────────────┐
        │   Aplicación móvil    │
        │                       │
        │ React Native + Expo   │
        │ TypeScript            │
        │ Android inicialmente  │
        └───────────┬───────────┘
                    │
                    │ Supabase SDK / HTTPS
                    │
                    ▼
        ┌───────────────────────┐
        │       Supabase        │
        │                       │
        │ Auth                  │
        │ PostgreSQL            │
        │ PostGIS               │
        │ Storage               │
        │ Realtime              │
        │ Edge Functions        │
        └───────────┬───────────┘
                    │
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
┌──────────────────┐   ┌────────────────────┐
│ Panel Admin Web  │   │ Servicios externos│
│                  │   │                    │
│ Next.js          │   │ Google Maps        │
│ TypeScript       │   │ Notifications      │
│                  │   │ Payments           │
└──────────────────┘   └────────────────────┘
```

---

## 3. Estilo arquitectónico

El sistema utilizará un **monolito modular**.

Esto significa que:

- El backend principal estará centralizado.
- La base de datos será única.
- Las funcionalidades estarán organizadas por módulos o dominios.
- Cada módulo tendrá responsabilidades claras.
- No se utilizarán microservicios en el MVP inicial.

Este enfoque permite mantener una arquitectura organizada sin introducir costos operativos y de mantenimiento innecesarios.

---

## 4. Módulos principales

Los módulos previstos inicialmente son:

- Autenticación.
- Gestión de usuarios.
- Perfiles de trabajadores.
- Aprobación administrativa.
- Certificación.
- Servicios.
- Categorías.
- Disponibilidad.
- Geolocalización.
- Búsqueda.
- Solicitudes de servicio.
- Cotizaciones.
- Reservas.
- Chat.
- Calificaciones.
- Favoritos.
- Notificaciones.
- Reportes.
- Administración.
- Pagos.

La lista podrá modificarse conforme se formalicen los requisitos.

---

## 5. Aplicación móvil

### Tecnología

- React Native.
- Expo.
- TypeScript.
- Expo Router.

### Responsabilidades

La aplicación móvil será responsable de:

- Registro e inicio de sesión.
- Navegación.
- Captura y presentación de información.
- Gestión de perfiles.
- Visualización de trabajadores.
- Mapas y geolocalización.
- Solicitudes de servicio.
- Cotizaciones.
- Reservas.
- Chat.
- Favoritos.
- Calificaciones.
- Notificaciones.
- Interacción con funcionalidades de certificación.

### Restricciones

La aplicación móvil no deberá contener lógica privilegiada de autorización.

La aplicación puede controlar comportamiento visual, pero las reglas críticas deberán validarse también en el backend o en la base de datos.

Ejemplo:

La interfaz puede ocultar un botón para trabajadores no aprobados, pero el backend también deberá impedir que un trabajador no aprobado aparezca públicamente.

---

## 6. Backend

El backend principal utilizará Supabase.

Supabase proporcionará:

- Autenticación.
- Acceso a PostgreSQL.
- Storage.
- Realtime.
- Edge Functions.
- Seguridad mediante Row Level Security.

No se desarrollará inicialmente un servidor adicional con Express, PHP, Laravel u otro framework backend.

Un backend separado solo podrá agregarse si existe una necesidad técnica documentada mediante un ADR.

---

## 7. Base de datos

La base de datos principal será PostgreSQL.

PostgreSQL almacenará información relacionada con:

- Usuarios.
- Trabajadores.
- Servicios.
- Categorías.
- Aprobaciones.
- Certificaciones.
- Disponibilidad.
- Solicitudes.
- Cotizaciones.
- Reservas.
- Conversaciones.
- Mensajes.
- Reseñas.
- Favoritos.
- Reportes.
- Pagos.
- Auditoría.

La estructura exacta será definida en:

`docs/03-database/`

---

## 8. Geolocalización

La funcionalidad geográfica utilizará PostGIS.

PostGIS permitirá:

- Almacenar ubicaciones geográficas.
- Buscar trabajadores cercanos.
- Filtrar por distancia.
- Aplicar radios de servicio.
- Crear índices espaciales.
- Evitar cálculos manuales de distancia en el cliente.

Ejemplo conceptual:

```text
Cliente
Ubicación actual
      ↓
Busca electricistas
      ↓
Radio de 5 km
      ↓
PostGIS
      ↓
Trabajadores cercanos
```

La ubicación privada de los trabajadores no deberá ser expuesta públicamente sin una política explícita de privacidad.

---

## 9. Autenticación

La autenticación utilizará Supabase Auth.

Supabase Auth será responsable de:

- Creación de cuentas.
- Inicio de sesión.
- Gestión de sesión.
- Recuperación de credenciales.
- Identificación del usuario autenticado.

La información específica del perfil de usuario no deberá duplicar innecesariamente los datos de autenticación.

Se distinguirán conceptualmente:

```text
auth.users
     ↓
profiles
```

---

## 10. Roles

Los roles iniciales serán:

- `customer`
- `worker`
- `admin`

Las funciones disponibles dependerán del rol.

Las reglas críticas de autorización no dependerán únicamente de verificaciones realizadas en la interfaz móvil.

Se utilizarán políticas de seguridad en backend y Row Level Security cuando corresponda.

---

## 11. Aprobación de trabajadores

La aprobación administrativa será una regla central del sistema.

Flujo:

```text
Worker
  ↓
Completa perfil
  ↓
draft
  ↓
Envía a revisión
  ↓
pending_approval
  ↓
Admin
  ├── approved
  └── rejected
```

Un trabajador con estado diferente de `approved` no podrá aparecer públicamente.

La lógica deberá aplicarse tanto en:

- Consultas públicas.
- Resultados de búsqueda.
- Resultados de mapas.
- Recomendaciones.

---

## 12. Certificación

La certificación será independiente de la aprobación.

La arquitectura deberá permitir representar:

```text
Aprobado + no certificado

Aprobado + certificado
```

Un trabajador no aprobado no podrá obtener visibilidad pública mediante una certificación.

El precio inicial planteado es Bs 50.

La duración, renovación y proceso exacto de certificación todavía no se encuentran definidos.

---

## 13. Storage

Supabase Storage será utilizado para archivos como:

- Fotografías de perfil.
- Imágenes de portafolio.
- Documentos de verificación.
- Evidencias futuras relacionadas con reportes.

Los archivos no se almacenarán como datos binarios dentro de PostgreSQL.

PostgreSQL almacenará referencias o rutas hacia los archivos.

---

## 14. Tiempo real

Supabase Realtime será utilizado inicialmente para funcionalidades que requieran actualización inmediata.

Principalmente:

- Mensajes.
- Cambios relevantes en conversaciones.
- Posibles actualizaciones de estado.

No se implementará un servidor WebSocket propio mientras Supabase Realtime cubra las necesidades del proyecto.

---

## 15. Panel administrativo

El panel administrativo utilizará:

- Next.js.
- TypeScript.

Su objetivo será permitir que administradores gestionen el sistema desde una interfaz web.

Responsabilidades previstas:

- Revisar trabajadores pendientes.
- Aprobar perfiles.
- Rechazar perfiles.
- Gestionar usuarios.
- Gestionar categorías.
- Gestionar reportes.
- Supervisar certificaciones.
- Consultar actividad de la plataforma.

El panel administrativo utilizará el mismo backend y la misma base de datos que la aplicación móvil.

No se creará una base de datos administrativa separada.

---

## 16. Servicios externos

Los servicios externos previstos incluyen:

### Google Maps

Para:

- Visualización de mapas.
- Geocodificación cuando corresponda.
- Experiencia geográfica del usuario.

### Sistema de notificaciones

Para:

- Nuevas solicitudes.
- Nuevos mensajes.
- Cambios de estado.
- Recordatorios.

La tecnología específica se definirá antes de implementar el módulo correspondiente.

### Pagos

La certificación de Bs 50 requerirá posteriormente una solución de pago.

La pasarela definitiva todavía no está seleccionada.

No debe implementarse una integración de pagos hasta formalizar:

- Proveedor.
- Flujo.
- Renovación.
- Política de reembolso.
- Duración de la certificación.

---

## 17. Comunicación entre componentes

La aplicación móvil se comunicará principalmente con Supabase mediante:

- Supabase JavaScript SDK.
- HTTPS.
- Realtime cuando sea necesario.

El panel administrativo utilizará los mismos servicios.

Vista conceptual:

```text
Mobile App
    │
    ├──────────────┐
    │              │
    ▼              ▼
Supabase Auth   PostgreSQL
                   │
                   ├── Storage
                   ├── Realtime
                   └── Edge Functions

Admin Web
    │
    └──────────────► Supabase
```

---

## 18. Edge Functions

Las Supabase Edge Functions se utilizarán únicamente cuando sea necesario ejecutar lógica segura del lado servidor.

Ejemplos potenciales:

- Procesamiento de webhooks.
- Operaciones administrativas sensibles.
- Integraciones externas.
- Notificaciones.
- Validaciones que no deben ejecutarse únicamente en el cliente.

No se utilizarán Edge Functions para operaciones simples que PostgreSQL, RLS o Supabase puedan resolver directamente.

---

## 19. Seguridad

La arquitectura deberá aplicar seguridad en múltiples capas.

### Cliente

- No almacenar secretos.
- Validar entradas.
- No confiar en variables locales para autorización.

### Backend

- Autenticación.
- Validaciones.
- Edge Functions cuando sean necesarias.

### Base de datos

- Foreign keys.
- Constraints.
- Row Level Security.
- Políticas por rol.
- Validaciones de integridad.

### Storage

- Políticas de acceso.
- Separación entre archivos públicos y privados.

---

## 20. Row Level Security

Las tablas expuestas al cliente deberán utilizar Row Level Security cuando corresponda.

Ejemplos conceptuales:

Un cliente podrá:

- Ver perfiles públicos aprobados.
- Leer sus propias solicitudes.
- Crear solicitudes.
- Leer conversaciones donde participa.

Un trabajador podrá:

- Modificar su propio perfil.
- Leer solicitudes relacionadas.
- Gestionar sus propios servicios.
- Acceder a conversaciones donde participa.

Un usuario no deberá poder modificar datos pertenecientes a otro usuario sin autorización.

---

## 21. Privacidad

La arquitectura deberá minimizar exposición innecesaria de información personal.

Especial atención deberá darse a:

- Ubicación del trabajador.
- Documentos de identidad.
- Datos de contacto.
- Conversaciones.
- Información de certificación.
- Información administrativa.

Los documentos utilizados para verificación no deberán ser públicamente accesibles.

---

## 22. Desarrollo por ambientes

Se contemplarán inicialmente los siguientes ambientes:

```text
Local
↓
Development
↓
Production
```

### Local

Utilizado por el desarrollador.

### Development

Entorno remoto utilizado para pruebas e integración.

### Production

Entorno utilizado por usuarios reales.

Producción se configurará cuando el proyecto haya alcanzado suficiente madurez.

---

## 23. Base de datos mediante migraciones

Los cambios estructurales de PostgreSQL deberán administrarse mediante migraciones versionadas.

Flujo esperado:

```text
Cambio de esquema
      ↓
Migración
      ↓
Prueba local
      ↓
Commit
      ↓
Development
      ↓
Production
```

No deberán realizarse cambios estructurales manuales en producción sin representación equivalente en el repositorio.

---

## 24. Control de versiones

Git será utilizado para control de versiones.

GitHub será utilizado como repositorio remoto.

La rama principal será:

`main`

Los desarrollos deberán realizarse en ramas específicas.

Ejemplo:

`feature/MOD-03-worker-approval`

---

## 25. Principio de separación de responsabilidades

Cada capa deberá tener responsabilidades claras.

### Mobile

Presentación e interacción con el usuario.

### Supabase

Servicios backend y acceso controlado.

### PostgreSQL

Persistencia, relaciones e integridad.

### PostGIS

Consultas geográficas.

### Storage

Archivos.

### Realtime

Actualizaciones en tiempo real.

### Edge Functions

Lógica segura o integraciones que requieran ejecución server-side.

### Admin Web

Operaciones administrativas.

---

## 26. Principio de simplicidad

No se introducirán nuevas tecnologías únicamente por preferencia técnica.

Cada tecnología adicional deberá solucionar un problema concreto.

Evitar inicialmente:

- Microservicios.
- Contenedores de producción complejos.
- Kubernetes.
- Event buses externos.
- Bases de datos adicionales.
- Elasticsearch.
- Redis.
- APIs duplicadas.
- Sistemas de autenticación propios.

---

## 27. Escalabilidad

El sistema debe permitir crecer sin diseñar prematuramente para millones de usuarios.

Las primeras estrategias de escalabilidad serán:

- Índices PostgreSQL.
- Índices PostGIS.
- Consultas eficientes.
- Paginación.
- Storage separado.
- Uso correcto de caché en cliente.
- Límites de consultas.
- Separación lógica por módulos.

Si aparecen problemas reales de escala, nuevas soluciones podrán evaluarse mediante Architecture Decision Records.

---

## 28. Arquitectura orientada a módulos

Cada módulo deberá intentar mantener juntas sus responsabilidades.

Ejemplo conceptual:

```text
workers/
├── profile
├── approval
├── certification
├── services
├── portfolio
└── availability
```

Esto no significa que todos los módulos deban utilizar carpetas idénticas.

La organización concreta se definirá al crear la aplicación.

---

## 29. Principios arquitectónicos

La arquitectura de Contrátame! seguirá estos principios:

1. Simplicidad antes que complejidad.
2. Seguridad por defecto.
3. Documentación continua.
4. Base de datos como fuente confiable de integridad.
5. Autorización server-side.
6. Separación clara de responsabilidades.
7. Componentes reutilizables.
8. Trazabilidad.
9. Migraciones reproducibles.
10. Evolución basada en necesidades reales.

---

## 30. Decisiones todavía pendientes

La arquitectura todavía deberá formalizar:

- Modelo exacto de datos.
- Políticas RLS definitivas.
- Arquitectura interna de carpetas móvil.
- Estrategia de estado local.
- Estrategia de server state.
- Estrategia exacta de notificaciones push.
- Proveedor de pagos.
- Arquitectura de certificación.
- Estrategia definitiva de geolocalización privada.
- Estrategia de observabilidad.
- Estrategia de pruebas E2E.
- Arquitectura final del panel administrativo.

Estas decisiones deberán tomarse y documentarse antes de implementar los módulos afectados.
