# MOD-10 — Chat / Mensajería en tiempo real

**Estado:** Implementado; validación automatizada completa  
**Requisitos:** `RF-085..RF-096`, `RNF-055..RNF-062`  
**Pruebas:** `TEST-300..TEST-349`  
**Registro:** `IMP-012`

## 1. Responsabilidad

MOD-10 activa las conversaciones que MOD-06 ya crea por solicitud. Materializa exclusivamente `messages`, persiste texto, ofrece bandeja/historia segura y entrega inserts de la conversación abierta mediante Supabase Realtime.

```text
service_request 1 ── 1 conversation 1 ── N messages
          customer ──────────────── worker asignado
```

No existen conversaciones libres, grupales o independientes de una solicitud.

## 2. Modelo congelado

`messages`: `id`, `conversation_id`, `sender_profile_id?`, `message_type`, `content`, `read_at?`, `created_at`. `content` permanece `text`; tipos `text/system`; sistema puede tener sender nulo. El usuario solo crea `text`.

Regla aprobada: texto normalizado de usuario entre 1 y 2.000 Unicode, validado por `char_length()` y `Array.from`; nunca truncado. No se aplica una nueva restricción a sistema. La retención permanece pendiente.

## 3. Contratos

- `send_conversation_message(conversation_id,message_id,content)`: envío idempotente, caller derivado, lock, active/participant, normalización, persistencia y notificación atómica.
- `get_my_conversation(conversation_id)`: contexto allowlist participante.
- `get_my_conversation_for_request(request_id)`: resuelve el vínculo congelado para el CTA de solicitud.
- `list_my_conversations(before_activity_at,before_id,limit)`: bandeja keyset, preview y actividad sin N+1.
- `list_conversation_messages(conversation_id,before_created_at,before_id,limit)`: historia hacia atrás, newest-first, máximo 50.
- `list_conversation_messages_after(conversation_id,after_created_at,after_id,limit)`: reconciliación hacia adelante tras reconexión.

## 4. Seguridad

Solo cliente y perfil propietario del worker asignado participan, siempre con cuenta activa/confirmada. `messages` tiene RLS; `authenticated` recibe SELECT exclusivamente para Postgres Changes y la política vuelve a comprobar participación. INSERT/UPDATE/DELETE directo permanecen revocados. Envío/historia son RPC endurecidas, sin actor/tipo/estado desde Expo.

La salida no incluye ubicación, request description, quote/booking, contacto, aprobación ni administración. Un worker cuya cuenta está suspendida queda bloqueado por MOD-01; MOD-10 no inventa una regla que borre la participación histórica por cambios de aprobación profesional.

## 5. Realtime

Se usa Postgres Changes porque es la opción soportada mínima para el MVP y permite aplicar RLS sobre la fila persistida. `messages` se agrega a `supabase_realtime`; el móvil escucha solo `INSERT` con `conversation_id=eq.<id>`. Cada `SUBSCRIBED` ejecuta reconciliación forward-keyset, el merge deduplica por UUID y el cleanup usa `removeChannel`.

No se usa Broadcast, Presence, typing, read receipts, polling ni servidor WebSocket propio. Si el volumen futuro supera el patrón MVP, Broadcast privado podrá evaluarse mediante decisión explícita sin cambiar la fuente canónica.

## 6. Experiencia móvil

- Bandeja Chat: conversaciones reales, contraparte, servicio, estado, preview, actividad, vacío/error/reintento y keyset.
- Conversación: cabecera contextual, burbujas azul/gris, sistema centrado, timestamps `America/La_Paz`, carga anterior, conexión, composer y safe-area/teclado.
- Composer: normaliza/valida, evita doble toque, reutiliza UUID tras resultado incierto, muestra contador desde 1.800 y nunca trunca.
- Solicitud: CTA `Abrir chat` resuelve su conversación real.
- Cerrada: historia visible y composer sustituido por aviso.

## 7. Notificación

Un insert nuevo crea `message_received` para la contraparte con referencia a conversación. No contiene el texto, no notifica al sender, no fabrica unread/read y no entrega push. Un retry idempotente no duplica notificación.

## 8. Fuera de alcance

Retención; cierre/reapertura; edición/eliminación; read receipts; adjuntos; audio/video; reacciones; respuestas; presencia; indicador escribiendo; grupos; IA; push; moderación; pagos; favoritos; certificación y rediseño general.

## 9. Estado de validación

El reset local aplicó MOD-01 a MOD-10 desde cero. pgTAP aprobó 10 archivos / 621 aserciones, con MOD-10 84/84, y el lint `public/private` no encontró errores. TypeScript, ESLint, Jest (12 suites / 142 pruebas), Expo Doctor (21/21), alineación de dependencias y export web también están aprobados. El dry-run enlazado lista únicamente `20261004010000_mod10_chat.sql` y no aplicó cambios. La implementación y validación automatizada se consideran completas; Android y la integración con dos sesiones reales permanecen como verificación manual diferida.

