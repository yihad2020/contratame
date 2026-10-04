# MOD-11 — Requisitos de notificaciones

**Módulo:** `MOD-11 — Notificaciones`  
**Implementación:** `IMP-013`  
**Pruebas:** `TEST-350..TEST-399`  
**Estado:** COMPLETE / validación automatizada aprobada; Android manual y push diferidos

## Alcance y fuente de verdad

La tabla congelada `public.notifications` es la fuente canónica. MOD-11 presenta y actualiza esas filas; no fabrica notificaciones en el cliente ni altera la creación transaccional ya implementada por MOD-06 a MOD-10. El alcance incluye bandeja in-app, lectura individual y actualización foreground con Supabase Realtime.

La entrega push Android queda diferida: aunque el modelo congelado define `device_push_tokens`, el proveedor, la infraestructura de envío y las credenciales siguen pendientes. Materializar esa entidad o elegir Expo Push Service/FCM/EAS sin decisión explícita inventaría arquitectura. Una falla o ausencia de push nunca afecta la fila canónica.

## Requisitos funcionales

### RF-097 — Bandeja canónica del destinatario

El sistema deberá mostrar al usuario autenticado únicamente sus filas de `notifications`, sin ejemplos hardcodeados.

**Criterios de aceptación**

- El destinatario se deriva de `auth.uid()` y no de un parámetro cliente.
- Las filas provienen de PostgreSQL y contienen título, cuerpo, tipo, estado de lectura y fecha canónicos.
- Una cuenta anónima, no confirmada, suspendida o desactivada no puede usar el contrato.
- No se muestran filas pertenecientes a otro perfil.

### RF-098 — Eventos existentes

La bandeja deberá representar los tipos ya producidos por MOD-06 a MOD-10: `service_request_created`, `quote_accepted`, `booking_created`, `booking_started`, `booking_completion_requested`, `booking_completed`, `review_received` y `message_received`.

**Criterios de aceptación**

- El texto español persistido se conserva sin reinterpretar reglas del evento.
- Cada tipo conocido tiene iconografía coherente con el sistema visual.
- Un tipo desconocido se conserva con icono neutro y no obtiene navegación inventada.
- No se agregan eventos nuevos a transacciones existentes.

### RF-099 — Orden y paginación deterministas

El sistema deberá listar las notificaciones más recientes primero mediante paginación keyset acotada.

**Criterios de aceptación**

- El orden es `created_at DESC, id DESC`.
- El cursor incluye ambos valores; un cursor incompleto se rechaza.
- Cada página admite de 1 a 50 filas y la interfaz usa 20.
- Páginas consecutivas no omiten ni duplican filas aun cuando varias comparten timestamp.

### RF-100 — Lectura individual y contador real

El destinatario deberá poder marcar una notificación como leída y consultar su cantidad real de no leídas.

**Criterios de aceptación**

- `read_at IS NULL` significa no leída y un timestamp PostgreSQL significa leída.
- Solo el propietario puede ejecutar la transición.
- La operación es idempotente y no permite enviar `read_at` desde el cliente.
- El contador se calcula en servidor sobre las filas canónicas del propietario.
- No se implementan borrado masivo, expiración ni retención.

### RF-101 — Navegación segura

Una notificación deberá ofrecer navegación solo cuando su entidad relacionada corresponde a una pantalla existente y soportada.

**Criterios de aceptación**

- `service_request` dirige al detalle de solicitud, `booking` al detalle de contratación y `conversation` al chat.
- La asociación se deriva en servidor de la fila canónica.
- `review` y tipos no soportados muestran fallback seguro, sin fabricar rutas.
- La pantalla destino vuelve a validar autorización; la notificación no concede acceso.

### RF-102 — Sincronización foreground

La bandeja deberá actualizarse en primer plano mediante Supabase Realtime y reconciliación RPC.

**Criterios de aceptación**

- La suscripción observa `INSERT` y `UPDATE` de `notifications` filtrados por el perfil autenticado.
- Cada evento y reconexión dispara lectura canónica; no se confía en el payload Realtime para renderizar.
- La mezcla deduplica por `notification_id` y conserva el orden determinista.
- El canal se elimina al desmontar la pantalla.
- El contador se vuelve a derivar del servidor.

### RF-103 — Estados y actualización de interfaz

La aplicación deberá ofrecer carga, vacío, error/reintento, pull-to-refresh, carga anterior y estado de conexión en español.

**Criterios de aceptación**

- No se confunde vacío con error o carga.
- Un error recuperable ofrece reintento sin eliminar filas ya cargadas.
- Pull-to-refresh reemplaza la vista por la primera página canónica.
- La lista distingue visual y accesiblemente filas leídas/no leídas.

### RF-104 — Entrada y badge

La aplicación deberá ofrecer una entrada accesible al centro de notificaciones desde el encabezado principal.

**Criterios de aceptación**

- El botón tiene etiqueta accesible y abre la ruta protegida `/notifications`.
- El badge usa el contador real del servidor, se oculta en cero y limita su representación visual a `99+`.
- La entrada no sustituye la navegación existente al perfil.

### RF-105 — Privacidad del payload

Los contratos de bandeja deberán exponer solo el allowlist necesario para presentar y navegar.

**Criterios de aceptación**

- No se devuelven `profile_id`, coordenadas, dirección exacta, correo ni contenido de mensaje escrito por usuarios.
- El preview de `message_received` usa el cuerpo genérico existente.
- No se conceden `INSERT`, `UPDATE` o `DELETE` directos sobre `notifications`.
- El cliente no incluye credenciales privilegiadas.

### RF-106 — Independencia de canales de entrega

La notificación canónica deberá permanecer disponible independientemente de push u otro canal futuro.

**Criterios de aceptación**

- Inbox, lectura y Realtime funcionan sin proveedor push.
- MOD-11 no materializa `device_push_tokens` hasta aprobar proveedor, alta/revocación y despacho.
- No se solicita permiso Android ni se registra token en esta implementación.
- Una futura falla de entrega no deberá eliminar ni revertir la fila canónica.

## Requisitos no funcionales

### RNF-063 — Autorización en base de datos

Los límites de propietario y cuenta activa/confirmada deberán cumplirse en PostgreSQL, no solo en UI.

**Criterios de aceptación:** RLS limita SELECT; RPCs `SECURITY DEFINER` fijan `search_path = ''`, derivan `auth.uid()` y tienen grants mínimos.

### RNF-064 — Privacidad por minimización

Los contratos deberán devolver solo datos necesarios para la bandeja.

**Criterios de aceptación:** el allowlist de diez campos no contiene ubicación privada, correo ni cuerpo de chat.

### RNF-065 — Consistencia e idempotencia

La actualización de lectura y la reconciliación deberán tolerar repetición.

**Criterios de aceptación:** marcar dos veces conserva `read_at`; la mezcla cliente deduplica; los cursores excluyen la fila frontera.

### RNF-066 — Rendimiento acotado

La lectura y el conteo deberán usar consultas acotadas e índices por destinatario.

**Criterios de aceptación:** existen índices `(profile_id, created_at DESC, id DESC)` general y parcial para no leídas; límites máximos se validan.

### RNF-067 — Accesibilidad y coherencia Android

Los controles deberán respetar el diseño móvil existente y ofrecer semántica accesible.

**Criterios de aceptación:** botones y filas declaran roles/etiquetas, los estados no dependen solo del color y se conservan touch targets existentes.

### RNF-068 — Localización temporal

La presentación deberá usar español y la zona semántica `America/La_Paz`.

**Criterios de aceptación:** tiempos recientes son relativos en español; fechas anteriores usan `es-BO` y `America/La_Paz`; PostgreSQL conserva `timestamptz`.

### RNF-069 — Recuperación de conectividad

La pérdida/reconexión no deberá producir duplicados ni convertir Realtime en fuente de verdad.

**Criterios de aceptación:** el estado de canal se informa, la reconexión consulta filas posteriores al cursor y vuelve a obtener la primera página/contador.

## Trazabilidad

`RF-097..RF-106` + `RNF-063..RNF-069` → `MOD-11` → migración `20261004020000_mod11_notifications.sql` → `TEST-350..TEST-399` → `IMP-013`.

## Decisiones pendientes preservadas

- Proveedor de push y servicio de despacho.
- Proyecto Firebase/credenciales FCM v1 y configuración EAS asociada.
- Momento UX aprobado para solicitar permiso Android.
- Reglas de registro, rotación, revocación e invalidación de `device_push_tokens`.
- Política de reintentos/deduplicación y observabilidad de entrega push.
- Retención, expiración, borrado y preferencias de notificación.

Ninguna de estas decisiones se infiere en MOD-11.
