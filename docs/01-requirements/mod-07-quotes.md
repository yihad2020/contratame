# Contrátame! — Requisitos de MOD-07: cotizaciones, revisiones y aceptación

**Módulo:** `MOD-07 — Cotizaciones, revisiones y aceptación`  
**Implementación:** `IMP-009`  
**Pruebas:** `TEST-180..TEST-219`  
**Estado:** Implementado y validado localmente; dry-run vinculado aprobado, integración real y Android diferidos

## 1. Objetivo

Permitir que el único worker destinatario de una solicitud directa emita una cotización y revisiones históricas, que los dos participantes consulten ese historial y que el cliente propietario acepte únicamente la revisión vigente. La aceptación crea atómicamente el booking congelado y su primer historial, pero MOD-07 no implementa el ciclo operativo del booking.

## 2. Reglas aprobadas

- Cada solicitud está dirigida a un único worker; no existe licitación entre varios profesionales.
- `quotes` conserva todas las revisiones. Una revisión nueva agrega una fila y no reescribe contenido histórico.
- La primera revisión usa número 1; las siguientes incrementan de forma determinística dentro de la solicitud.
- Solo una revisión queda vigente (`pending`) y solo una puede quedar `accepted` por solicitud.
- El worker actor se deriva de `auth.uid()` y debe ser el propietario del `worker_profiles` destinatario, cuya cuenta y aprobación siguen vigentes.
- El cliente actor de aceptación se deriva de `auth.uid()` y debe ser `service_requests.customer_profile_id`.
- MOD-07 usa únicamente los estados congelados de solicitud y cotización. No implementa rechazo, retiro ni cancelación porque sus actores y reglas no están aprobados.
- Aceptar una cotización crea el booking, primer `booking_status_history` y notificaciones persistentes dentro de la misma transacción.
- `preferred_date` y `preferred_time` siguen siendo preferencias opcionales e independientes; no constituyen el horario contractual y no se modifican al aceptar.

## 3. Decisión aprobada de horario definitivo

La aceptación exige fecha y hora finales completas. La interfaz las precarga así:

- ambas preferencias presentes: precarga ambas;
- solo fecha: precarga fecha y exige hora;
- solo hora: precarga hora y exige fecha;
- ninguna: exige ambas.

El cliente puede cambiar cualquier valor precargado. La acción permanece deshabilitada hasta obtener una fecha/hora válida y futura. El móvil envía fecha y hora separadas; PostgreSQL vuelve a validarlas y construye `bookings.scheduled_at` con semántica `America/La_Paz` sobre `timestamptz`. Nunca se confía en un timestamp calculado por el cliente ni se fabrica un horario desde preferencias incompletas.

## 4. Requisitos funcionales

### RF-058 — Crear la primera cotización

El worker destinatario podrá crear la primera cotización de una solicitud `pending` mediante una operación controlada.

**Criterios de aceptación:**

- Caller autenticado, confirmado y `active`; worker propietario, `approved` y con cuenta `active`.
- La función acepta solicitud, monto BOB, mensaje opcional y vigencia opcional; no acepta worker actor, número de revisión ni estado.
- Monto positivo `numeric(12,2)` con máximo dos decimales.
- La primera fila usa `revision_number = 1`, estado `pending` y conserva `created_at`/`updated_at`.
- La solicitud cambia `pending → quoted` en la misma transacción.
- Cliente, anónimo, worker ajeno y cuenta inactiva/no confirmada no pueden cotizar.

### RF-059 — Crear revisiones inmutables

El worker destinatario podrá emitir una nueva revisión mientras la solicitud siga `quoted` y aceptable.

**Criterios de aceptación:**

- La solicitud se bloquea antes de calcular el número siguiente.
- La nueva revisión obtiene `max(revision_number) + 1` y una restricción única impide duplicados.
- La revisión `pending` anterior cambia a `superseded`; su monto, mensaje, vigencia y creación permanecen intactos.
- Existe como máximo una revisión `pending` por solicitud.
- Una solicitud `accepted`, `cancelled`, `rejected`, `expired` o cuyo `expires_at` venció no admite revisiones.
- Una cotización aceptada no puede reemplazarse.

### RF-060 — Consultar historial participante

Cliente propietario y worker destinatario podrán consultar todas las revisiones de su solicitud.

**Criterios de aceptación:**

- Una RPC participante devuelve allowlist de `quotes`, ordenada por `revision_number DESC` con desempate determinístico.
- Cada fila incluye número, monto, mensaje, estado, vigencia y timestamps; la revisión más reciente se identifica claramente.
- Cuando existe aceptación, solo la fila aceptada expone el identificador mínimo de booking y `scheduled_at` necesario para el handoff visual.
- Cliente o worker ajeno, cuenta no activa/no confirmada y anónimo no obtienen el historial.
- Marketplace y perfil público siguen sin datos de cotización.

### RF-061 — Aceptar únicamente la revisión vigente

El cliente propietario podrá aceptar una revisión actual `pending` de una solicitud `quoted`.

**Criterios de aceptación:**

- La RPC deriva el cliente de `auth.uid()`, bloquea la solicitud y vuelve a leer la cotización.
- La cotización pertenece a esa solicitud, es la revisión máxima, sigue `pending` y no venció.
- El worker continúa `approved` y su cuenta `active`.
- Revisión reemplazada, vencida, de otra solicitud, ya aceptada o solicitud terminal se rechaza.
- Worker, cliente ajeno y anónimo no pueden aceptar.
- Una segunda aceptación sobre la misma solicitud falla sin modificar el resultado original.

### RF-062 — Confirmar el horario definitivo

La aceptación deberá incluir fecha y hora finales explícitas y confirmadas por el cliente.

**Criterios de aceptación:**

- Se aplica el comportamiento de precarga definido en la sección 3.
- El cliente puede modificar los valores precargados antes de confirmar.
- La UI exige formato válido, ambas partes y un instante futuro; no habilita la acción con datos incompletos.
- La RPC recibe `date` y `time`, no `scheduled_at` ni zona horaria controlable por cliente.
- PostgreSQL construye el instante con `America/La_Paz` y lo guarda como `timestamptz`.
- Las preferencias originales no se alteran.

### RF-063 — Crear el handoff de booking atómicamente

Aceptar una cotización deberá materializar el contrato congelado de booking en una sola transacción.

**Criterios de aceptación:**

- Cotización cambia a `accepted` y solicitud cambia a `accepted`.
- Se crea exactamente un `bookings` con request, quote, participantes, título de servicio, monto acordado, horario definitivo y estado `scheduled`.
- Se crea un primer `booking_status_history` con estado previo nulo, nuevo `scheduled` y actor cliente.
- Se crean notificaciones persistentes para los participantes; no se agrega push ni bandeja nueva.
- Si horario, booking, historial o notificación falla, la cotización y solicitud conservan sus estados anteriores y no queda fila parcial.
- MOD-08 será responsable de inicio, finalización, cancelación y demás ciclo del booking.

### RF-064 — Integrar la experiencia del worker

El detalle de solicitud del worker deberá permitir enviar cotización o revisión y consultar el historial real.

**Criterios de aceptación:**

- `pending` sin cotización muestra “Enviar cotización”; `quoted` muestra “Enviar nueva revisión”.
- El formulario usa solo monto, mensaje y vigencia de la entidad congelada.
- Incluye validación, submitting, error seguro, cancelación y recarga posterior.
- Revisiones anteriores son de solo lectura.
- Estados no cotizables no muestran una acción habilitada.

### RF-065 — Integrar la experiencia del cliente

El detalle de solicitud del cliente deberá mostrar historial, revisión actual y aceptación confirmada.

**Criterios de aceptación:**

- Muestra precio BOB, mensaje, estado, fecha, vigencia y revisión actual sin IDs internos innecesarios.
- Solo una revisión realmente aceptable presenta “Aceptar cotización por Bs …”.
- Una segunda etapa confirma monto y horario definitivo antes de ejecutar la RPC.
- Tras éxito se recargan solicitud e historial, se deshabilitan nuevas aceptaciones y se muestra el horario del handoff.
- No se muestra UI del ciclo de booking de MOD-08.

### RF-066 — Aplicar privacidad posaceptación

La ubicación exacta de la solicitud seguirá privada antes del booking y se habilitará al worker participante después de la contratación.

**Criterios de aceptación:**

- Cliente propietario conserva acceso a su ubicación exacta.
- Worker destinatario obtiene dirección/coordenadas solo cuando existe el booking de esa solicitud.
- Otros clientes, workers, anónimo, marketplace y perfil público no obtienen ubicación transaccional.
- El cambio se expresa mediante política/RPC participante y no mediante exposición pública de la tabla.

## 5. Requisitos no funcionales

### RNF-039 — Autorización y mínimo privilegio

**Criterios de aceptación:** RPC `SECURITY DEFINER`, `search_path = ''`, objetos calificados y actores derivados de `auth.uid()`; `anon` sin `EXECUTE`; clientes normales sin INSERT/UPDATE/DELETE directo sobre quotes, bookings, historial o estados de solicitud; sin `service_role` en Expo.

### RNF-040 — Integridad, atomicidad y concurrencia

**Criterios de aceptación:** locks de solicitud serializan dos revisiones, dos aceptaciones y revisión contra aceptación; índices únicos protegen número, vigente, aceptada y booking; validación de coherencia del booking en base de datos; fallos revierten la sentencia completa.

### RNF-041 — Privacidad y minimización

**Criterios de aceptación:** solo participantes leen historial; contratos omiten email, teléfono, Auth, snapshots, roles y coordenadas no autorizadas; no se amplían RPC públicas; errores visibles no filtran SQL.

### RNF-042 — Rendimiento, mantenibilidad y compatibilidad

**Criterios de aceptación:** una RPC obtiene el historial completo sin consulta por revisión; orden respaldado por índice; TypeScript estricto; lógica de validación/normalización separada de UI; Expo SDK 57 y sistema visual existente, sin dependencia nueva.

### RNF-043 — Pruebas, regresión y trazabilidad

**Criterios de aceptación:** `RF-058..RF-066`, `RNF-039..RNF-043`, `MOD-07`, `TEST-180..TEST-219`, migración e `IMP-009` mantienen referencias; pgTAP cubre autorización, historial, atomicidad, privacidad y protecciones concurrentes; Jest cubre lógica pura; MOD-01 a MOD-06 permanecen verdes.

## 6. Fuera de alcance y pendientes preservados

No se implementan rechazo o retiro de cotización, cancelación de solicitud/booking, inicio o finalización del trabajo, reseñas, mensajes/chat, UI/push de notificaciones, favoritos, certificación ni pagos. Permanecen pendientes políticas de cancelación, disputas, no-show, retención y push. `rejected`, `withdrawn` y `expired` se conservan como estados congelados, pero MOD-07 no inventa actores ni transiciones para producirlos.

## 7. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-058..RF-066` | `MOD-07` | `TEST-180..TEST-219` | `IMP-009` |
| `RNF-039..RNF-043` | `MOD-07` | `TEST-180..TEST-219` | `IMP-009` |
