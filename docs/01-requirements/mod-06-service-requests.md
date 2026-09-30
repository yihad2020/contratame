# Contrátame! — Requisitos de MOD-06: solicitudes directas de servicio

**Módulo:** `MOD-06 — Solicitudes directas de servicio`  
**Implementación:** `IMP-008`  
**Pruebas:** `TEST-140..TEST-179`  
**Estado:** Implementado; validación local automatizada aprobada, dry-run vinculado bloqueado y Android real diferido

## 1. Objetivo

Permitir que un cliente autenticado envíe la primera transacción real a un worker específico y a uno de sus servicios activos, registre de forma privada el lugar del trabajo y ofrezca vistas mínimas para cliente y worker antes de cotización, sin convertir el producto en un mercado abierto ni anticipar cotizaciones, bookings o chat.

## 2. Requisitos funcionales

### RF-049 — Crear una solicitud directa elegible

El sistema deberá crear una `service_requests` dirigida a un `worker_profiles` específico mediante una operación controlada que derive el cliente de `auth.uid()`.

**Criterios de aceptación:**

- El caller debe estar autenticado, con correo confirmado y `profiles.account_status = 'active'`.
- El target debe conservar cuenta `active`, worker `approved`, ubicación profesional y elegibilidad pública vigente.
- La RPC no acepta `customer_profile_id` ni `status`; ambos se determinan en base de datos.
- Una solicitud válida comienza en `pending` y `expires_at` queda `NULL`, porque no existe una política de expiración aprobada.
- No se agrega una prohibición de auto-contratación: el modelo congelado no la define. Cualquier cambio requiere una decisión explícita posterior.

### RF-050 — Seleccionar un servicio vigente del worker

El cliente deberá elegir un `worker_services` activo perteneciente al mismo worker y a una categoría activa.

**Criterios de aceptación:**

- La pantalla ofrece exclusivamente los servicios activos entregados por el contrato público vigente del worker.
- El servidor vuelve a validar worker, pertenencia, estado del servicio y estado de la categoría; no confía en la asociación enviada por móvil.
- Un servicio inactivo, histórico, de otro worker o de categoría inactiva es rechazado sin crear filas transaccionales.
- Workers `draft`, `pending_approval`, `rejected` o `suspended` y cuentas no activas no reciben solicitudes nuevas.

### RF-051 — Registrar únicamente los datos aprobados de la solicitud

La solicitud deberá admitir descripción, fecha/hora preferidas opcionales, presupuesto BOB opcional y `job_area_label`, utilizando solo las columnas congeladas.

**Criterios de aceptación:**

- La descripción y `job_area_label` son obligatorios después de normalizar espacios.
- La descripción admite 1–2000 caracteres, `job_area_label` 1–160 y la dirección privada opcional hasta 300; no se trunca silenciosamente contenido.
- Fecha `date`, hora `time` y presupuesto positivo son opcionales e independientes; no se infieren reglas de agenda todavía no aprobadas.
- El presupuesto es una referencia, no una cotización ni un precio acordado.
- No se agregan fotos, urgencia, categoría independiente, contacto, tracking ni campos ajenos al esquema congelado.

### RF-052 — Registrar la ubicación exacta privada

El sistema deberá crear una fila 1:1 en `service_request_locations` con `exact_location geography(Point,4326)` y dirección opcional.

**Criterios de aceptación:**

- La ubicación actual se solicita solo cuando el usuario pulsa la acción correspondiente; denegar permiso conserva la selección manual.
- Android/iOS permite marcar el punto en mapa y web mantiene una entrada manual explícita para compilación/pruebas.
- Se rechazan coordenadas ausentes, no finitas, `NaN` o fuera de latitud `[-90,90]` y longitud `[-180,180]` en cliente y servidor.
- El cliente propietario obtiene su ubicación exacta mediante detalle autorizado.
- Antes de existir un booking, el worker ve `job_area_label`, pero no dirección ni coordenadas exactas.
- Marketplace y perfil público permanecen incapaces de devolver ubicación transaccional.

### RF-053 — Crear los acompañantes congelados atómicamente

La creación deberá insertar solicitud, ubicación, conversación y notificación receptora dentro de la misma transacción.

**Criterios de aceptación:**

- Cada solicitud válida crea exactamente una `service_request_locations` y una `conversations` `active`.
- Se crea una `notifications` dirigida al perfil del worker con referencia a la solicitud.
- La notificación es solo un registro acompañante exigido por el modelo; MOD-06 no implementa bandeja, push ni UI de notificaciones.
- Un fallo en ubicación, conversación o notificación revierte todas las filas de la operación.
- Clientes no reciben permisos de inserción directa sobre ninguna de las cuatro tablas.

### RF-054 — Consultar solicitudes propias como cliente

El cliente deberá disponer de una vista real y paginada de sus solicitudes y un detalle autorizado.

**Criterios de aceptación:**

- La lista retorna únicamente filas con `customer_profile_id = auth.uid()` mediante una RPC controlada.
- Cada elemento muestra servicio, identidad pública minimizada del worker, creación, estado, zona y resumen esencial.
- La lista no incluye dirección, coordenadas ni geometrías.
- El detalle del cliente puede mostrar sus datos exactos privados.
- El orden es determinístico por `created_at DESC, id DESC`, con páginas de 1–20 y tamaño móvil 12.

### RF-055 — Consultar solicitudes dirigidas al worker

El propietario de un worker deberá disponer de una bandeja mínima y detalle de solicitudes dirigidas a ese worker.

**Criterios de aceptación:**

- La lista deriva el worker desde `worker_profiles.profile_id = auth.uid()` y nunca acepta un worker actor enviado por el cliente.
- Solo aparecen solicitudes cuyo `worker_id` corresponde al caller.
- El detalle muestra servicio, nombre minimizado del cliente, descripción, preferencia, presupuesto, zona y estado.
- Dirección y coordenadas son `NULL` para el worker mientras no exista booking.
- No existe acción de cotizar, cambiar estado o contactar en MOD-06.

### RF-056 — Integrar perfil público y navegación funcional

El perfil público deberá ofrecer una acción real `Solicitar servicio`, y la navegación autenticada deberá exponer `Solicitudes` solo con su vista funcional.

**Criterios de aceptación:**

- La acción abre `/(app)/worker/[workerId]/request` con el worker vigente y exige seleccionar un servicio.
- El formulario incluye edición, revisión, submitting, éxito, error seguro y reintento donde corresponde.
- El éxito permite abrir el detalle creado o `Mis solicitudes`.
- La barra inferior contiene Inicio, Explorar, Solicitudes y Mi perfil, todos con rutas reales.
- MOD-05 no se rediseña más allá de agregar el CTA.

### RF-057 — Preservar el estado congelado sin anticipar módulos

MOD-06 deberá reconocer exclusivamente `pending`, `quoted`, `accepted`, `rejected`, `cancelled` y `expired`, pero solo creará el estado inicial.

**Criterios de aceptación:**

- La creación siempre usa `pending` y el cliente no puede enviar otro estado.
- No existen updates directos de estado desde Expo.
- No se implementa cancelación porque la política detallada está explícitamente pendiente.
- No se crean cotizaciones, revisiones, bookings, ciclos de trabajo, reseñas ni mensajes.
- Estados que pudieran producir módulos posteriores se presentan de forma segura si ya existen, sin habilitar transiciones.

## 3. Requisitos no funcionales

### RNF-033 — Autorización y mínimo privilegio

**Criterios de aceptación:**

- Las RPC son `SECURITY DEFINER`, fijan `search_path = ''`, califican objetos y obtienen actor con `auth.uid()`.
- `anon` no ejecuta RPC ni lee tablas MOD-06.
- `authenticated` no recibe INSERT/UPDATE/DELETE directo sobre solicitud, ubicación, conversación o notificación.
- RLS expresa participantes, cliente propietario de ubicación y receptor de notificación aunque la API móvil use contratos controlados.
- El rol admin existente no obtiene por omisión una lista general ni ubicación exacta: el modelo congelado limita estas solicitudes a participantes y no define todavía una operación administrativa para MOD-06.

### RNF-034 — Privacidad por minimización de datos

**Criterios de aceptación:**

- Las listas no exponen `exact_location`, dirección, email, teléfono ni identidad Auth.
- Los nombres de contraparte usan nombre e inicial de apellido.
- El detalle worker reemplaza ubicación exacta por `job_area_label` hasta un booking futuro autorizado.
- Ninguna coordenada se registra en logs, documentación o mensajes de error.

### RNF-035 — Integridad y atomicidad

**Criterios de aceptación:**

- Foreign keys, checks, índices y unicidad 1:1 preservan el modelo congelado.
- La relación worker/servicio se valida dentro de PostgreSQL bajo locks de lectura de elegibilidad.
- Una falla de cualquier acompañante revierte la operación completa.
- Los errores críticos de autorización e integridad no dependen solo de la UI.

### RNF-036 — Rendimiento y determinismo

**Criterios de aceptación:**

- Creación usa una RPC y cada lista/detalle usa una RPC, sin N+1 por tarjeta.
- Se materializan los tres índices congelados de `service_requests` y el GIST de ubicación.
- Listas tienen límite máximo 20, conteo total y orden total estable.

### RNF-037 — Compatibilidad y mantenibilidad móvil

**Criterios de aceptación:**

- Se conservan Expo SDK 57, Expo Router y TypeScript estricto sin dependencia nueva.
- Validación, normalización, payload y errores quedan fuera de componentes presentacionales.
- Se reutilizan sistema visual, `expo-location` y capacidad de mapa existentes.
- Los errores visibles son mensajes seguros en español; el detalle técnico solo se registra en desarrollo.

### RNF-038 — Pruebas, regresión y trazabilidad

**Criterios de aceptación:**

- `RF-049..RF-057`, `RNF-033..RNF-038`, `MOD-06`, `TEST-140..TEST-179` e `IMP-008` mantienen referencias consistentes.
- pgTAP cubre contrato, elegibilidad, actor, atomicidad, participantes, privacidad, estados y paginación.
- Jest cubre validación, normalización, payload, errores, estados y deduplicación.
- Las suites MOD-01 a MOD-05 permanecen aprobadas.

## 4. Fuera de alcance y pendientes preservados

Quedan fuera cotizaciones/revisiones y aceptación, booking y ciclo de trabajo, cancelación, reseñas, chat/mensajes, UI o push de notificaciones, favoritos, certificación y pagos. Permanecen pendientes la política de cancelaciones, disputas, no-show, retención y proveedor de push. El modelo no contiene una prohibición de auto-contratación; MOD-06 no inventa una. Tampoco existe una operación administrativa aprobada para leer ubicaciones exactas de solicitudes, por lo que no se agrega.
