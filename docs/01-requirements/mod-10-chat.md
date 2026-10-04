# Contrátame! — Requisitos de MOD-10: chat y mensajería en tiempo real

**Módulo:** `MOD-10 — Chat / Mensajería en tiempo real`  
**Implementación:** `IMP-012`  
**Pruebas:** `TEST-300..TEST-349`  
**Estado:** Implementado; validación automatizada completa

## 1. Reglas aprobadas

- Una conversación existe únicamente como consecuencia de una solicitud real de servicio y conserva `UNIQUE(service_request_id)`.
- Solo el cliente de la solicitud y el perfil propietario del worker asignado participan.
- Los tipos congelados son `text` y `system`; el usuario solo crea `text` y el sistema conserva remitente opcional.
- Un texto de usuario normalizado debe contener entre 1 y 2.000 caracteres Unicode. No se trunca.
- Una conversación `closed` permanece legible, pero no acepta nuevos mensajes.
- No se implementan edición, eliminación, adjuntos, reacciones, presencia, escritura, llamadas ni confirmaciones de lectura.
- La retención de mensajes continúa pendiente y no se resuelve en MOD-10.

## 2. Requisitos funcionales

### RF-085 — Materializar mensajes congelados

MOD-10 materializará `messages` con las siete columnas del esquema congelado. **Aceptación:** FK hacia conversación y perfil, tipos `text/system`, timestamps PostgreSQL, `content text` y ninguna entidad/columna adicional.

### RF-086 — Enviar texto como participante

Cliente o worker asignado podrá enviar en una conversación activa. **Aceptación:** caller derivado de `auth.uid()`, cuenta activa/confirmada, participación revalidada, sender y tipo no controlables por cliente, timestamp servidor y respuesta allowlist.

### RF-087 — Validar contenido aprobado

El texto se recortará y colapsará por espacios antes de validar. **Aceptación:** `char_length()` servidor y `Array.from(...).length` móvil aceptan 1–2.000 Unicode; vacío/solo espacios/2.001 fallan; 2.000 y Unicode válido pasan sin truncar; la regla no altera `system`.

### RF-088 — Hacer el envío idempotente

El móvil asignará un UUID por intento lógico y lo reutilizará tras resultado incierto. **Aceptación:** mismo UUID/caller/conversación/contenido devuelve la fila existente sin segunda notificación; reutilización conflictiva falla; doble toque se bloquea localmente.

### RF-089 — Consultar historial paginado

Participantes consultarán páginas acotadas ordenadas determinísticamente. **Aceptación:** keyset `(created_at,id)`, máximo 50, primera página 30, carga de anteriores, terceros/anónimos bloqueados y conversación cerrada legible.

### RF-090 — Listar conversaciones reales

La bandeja mostrará solo conversaciones propias con contraparte, servicio, estado, preview y actividad. **Aceptación:** una consulta paginada sin N+1, keyset estable, máximo 20, orden por actividad/ID y ningún dato privado de ubicación/contacto/aprobación.

### RF-091 — Presentar una conversación móvil funcional

La pantalla mostrará contexto, burbujas, remitente, timestamp, composer y estados. **Aceptación:** carga/vacío/error/reintento, envío/correcto/fallido, anteriores, teclado/safe-area Android, contador desde 1.800 y composer deshabilitado al cerrar.

### RF-092 — Recibir mensajes en tiempo real

El chat abierto recibirá inserts mediante Supabase Realtime. **Aceptación:** filtro por conversación, RLS participante, publicación explícita, deduplicación con historia/envío y ninguna infraestructura WebSocket propia.

### RF-093 — Recuperar reconexiones

Cada suscripción/reconexión reconciliará mensajes posteriores al último cursor. **Aceptación:** RPC forward-keyset acotada, iteración hasta alcanzar el presente, estado de conexión visible, sin polling continuo y cleanup al desmontar.

### RF-094 — Integrar navegación real

Chat será destino funcional y cada detalle de solicitud abrirá su conversación. **Aceptación:** rutas Expo Router por conversación/solicitud, pestaña Chat real y Home, Explorar, Solicitudes, Trabajos y Perfil permanecen funcionales.

### RF-095 — Notificar al receptor

Cada mensaje nuevo generará `message_received` para la contraparte. **Aceptación:** receptor derivado, sender no notificado, referencia a conversación, sin push/unread y rollback atómico ante fallo; retry idempotente no duplica.

### RF-096 — Preservar sistema y cierres

MOD-10 no ofrecerá creación cliente de `system` ni transición de conversación. **Aceptación:** sistema conserva forma congelada, usuarios no modifican participantes/status y closed solo lectura.

## 3. Requisitos no funcionales

### RNF-055 — Autorización de mínimo privilegio

RPC `SECURITY DEFINER`, `search_path = ''`, objetos calificados, grants estrechos, RLS en mensajes, sin `service_role` ni DML directo.

### RNF-056 — Privacidad

Los contratos omiten coordenadas/dirección, correo, teléfono, aprobación y administración. Realtime entrega filas únicamente cuando la política SELECT participante/activa autoriza.

### RNF-057 — Integridad y concurrencia

FK, checks, lock de conversación, UUID idempotente y transacción de mensaje/notificación protegen identidad, límite, cierre y duplicados.

### RNF-058 — Rendimiento

Índice `(conversation_id, created_at DESC, id DESC)`, keyset, páginas acotadas, preview en consulta única, filtro Realtime y cero polling/N+1.

### RNF-059 — Ciclo de suscripción

Una pantalla mantiene un canal; cleanup usa `removeChannel`; reconexión sincroniza huecos y merge por `message_id` evita duplicados/memory leaks.

### RNF-060 — Usabilidad y accesibilidad

Controles táctiles, etiquetas accesibles, jerarquía azul/verde, feedback español seguro, contador y composición compacta inspirada en `screen_ideas/chat.png` sin copiar funciones no aprobadas.

### RNF-061 — Compatibilidad

Expo SDK 57, TypeScript estricto y `@supabase/supabase-js` existente, sin dependencia ni backend adicional.

### RNF-062 — Pruebas y trazabilidad

`RF-085..RF-096`, `RNF-055..RF-062`, `MOD-10`, `TEST-300..349`, migración e `IMP-012` se enlazan y reejecutan MOD-01..09.

## 4. Pendientes preservados

- Retención/eliminación/anonimización de mensajes.
- Read receipts y uso futuro de `read_at`.
- Creación y contenido de mensajes `system` por flujos futuros.
- Política/actor para cerrar una conversación.
- Push de MOD-11.

## 5. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-085..RF-096` | `MOD-10` | `TEST-300..TEST-349` | `IMP-012` |
| `RNF-055..RNF-062` | `MOD-10` | `TEST-300..TEST-349` | `IMP-012` |

