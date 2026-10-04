# MOD-11 — Notificaciones

**Requisitos:** `RF-097..RF-106`, `RNF-063..RNF-069`  
**Pruebas:** `TEST-350..TEST-399`  
**Implementación:** `IMP-013`  
**Estado:** COMPLETE / validación automatizada aprobada; Android manual y push diferidos

## 1. Objetivo

Dar al usuario autenticado una bandeja móvil segura y actualizada de las notificaciones transaccionales que MOD-06 a MOD-10 ya persisten. `public.notifications` permanece como única fuente de verdad.

## 2. Responsabilidades

- Leer solo las notificaciones del perfil autenticado.
- Ordenar y paginar con cursor `(created_at, id)`.
- Calcular no leídas en servidor y marcar una fila propia como leída de forma idempotente.
- Presentar los ocho tipos existentes con contenido español e iconos del producto.
- Derivar hints de navegación para solicitud, booking y conversación.
- Sincronizar el foreground mediante Postgres Changes y reconciliación RPC.
- Mantener carga, vacío, error, refresh, paginación y fallback seguro.

## 3. Fuera de alcance

- Crear nuevos eventos o modificar la atomicidad de MOD-06 a MOD-10.
- Push Android, `device_push_tokens` físico y despacho, hasta resolver las decisiones pendientes.
- Email, SMS, pagos, favoritos, certificación o administración nueva.
- Preferencias, borrado, retención, expiración o lectura masiva.
- Autorizar la pantalla destino mediante el payload de notificación.
- Rediseño visual general.

## 4. Modelo y eventos

La entidad congelada no cambia:

| Columna | Semántica |
|---|---|
| `id uuid` | Identidad canónica. |
| `profile_id uuid` | Destinatario, FK a `profiles`. |
| `type text` | Tipo de evento existente. |
| `title text`, `body text` | Contenido persistido en español. |
| `related_entity_type text`, `related_entity_id uuid` | Asociación polimórfica opcional. |
| `read_at timestamptz` | `NULL` no leída; timestamp leída. |
| `created_at timestamptz` | Fecha servidor. |

Eventos integrados:

| Tipo | Origen | Destino seguro |
|---|---|---|
| `service_request_created` | MOD-06 | solicitud |
| `quote_accepted` | MOD-07 | booking |
| `booking_created` | MOD-07 | booking |
| `booking_started` | MOD-08 | booking |
| `booking_completion_requested` | MOD-08 | booking |
| `booking_completed` | MOD-08 | booking |
| `review_received` | MOD-09 | fallback; no existe detalle por review |
| `message_received` | MOD-10 | conversación |

## 5. Contratos PostgreSQL

| Contrato | Resultado |
|---|---|
| `list_my_notifications(before_created_at, before_id, limit)` | Página owner-only más reciente primero, máximo 50. |
| `list_my_notifications_after(after_created_at, after_id, limit)` | Reconciliación ascendente posterior al cursor, máximo 100. |
| `get_my_notification_unread_count()` | Conteo real `read_at IS NULL` del caller. |
| `mark_my_notification_read(notification_id)` | Transición idempotente owner-only con timestamp servidor. |

Todos derivan el destinatario de `auth.uid()`, exigen cuenta activa/confirmada, son `SECURITY DEFINER`, fijan `search_path = ''` y exponen EXECUTE solo a `authenticated`. La tabla concede SELECT a `authenticated` únicamente para Postgres Changes; RLS `notifications_select_receiver` sigue siendo el límite. DML directo permanece revocado.

El allowlist de lectura tiene exactamente: `notification_id`, `notification_type`, `title`, `body`, `related_entity_type`, `related_entity_id`, `navigation_target_type`, `navigation_target_id`, `read_at`, `created_at`.

## 6. Flujo móvil

1. El encabezado principal consulta el contador servidor y muestra badge real.
2. El usuario abre `/notifications` dentro del grupo protegido.
3. La pantalla solicita la primera página y el contador en paralelo.
4. Pull-to-refresh reemplaza la primera página; “Cargar anteriores” usa el cursor más antiguo.
5. Realtime observa solo `INSERT`/`UPDATE` del perfil. Ante evento o reconexión, la app recupera filas por RPC y deduplica por ID.
6. Al tocar una fila no leída, primero persiste `read_at`; después navega si existe destino soportado.
7. La pantalla destino ejecuta sus propios contratos y autorización. Un destino inexistente/inaccesible conserva un fallback seguro.

## 7. Realtime

`notifications` se añade a `supabase_realtime`. El cliente filtra `profile_id=eq.<auth.uid()>`; RLS impide eventos ajenos. El payload no se renderiza directamente: actúa como señal para reconciliar la fuente canónica. La suscripción se elimina al desmontar.

## 8. Push Android diferido

No se agregó `expo-notifications`, `device_push_tokens` ni dispatcher. La documentación oficial de Expo SDK 57 exige un desarrollo nativo/EAS para push remoto Android y credenciales FCM v1; Expo Go no lo valida. Además, el modelo del proyecto deja pendiente el proveedor. Antes de implementarlo se debe aprobar:

1. Expo Push Service como proveedor y su servicio confiable de despacho, o alternativa documentada.
2. Propiedad/configuración del proyecto Firebase, clave FCM v1 y credenciales EAS (nunca en el cliente).
3. Momento explícito de consentimiento, registro/rotación/revocación de token y política de invalidación.
4. Reintentos, deduplicación, payload mínimo y observabilidad.

La bandeja canónica funciona sin ese canal.

## 9. Seguridad y privacidad

- Ningún RPC acepta destinatario, título, cuerpo ni timestamp de lectura controlado por el cliente.
- La interfaz nunca recibe ubicación exacta, email ni contenido de chat.
- La notificación es información de navegación, no autorización.
- No existe key `service_role` en el móvil.
- Los eventos existentes conservan su inserción dentro de las transacciones de negocio.

## 10. Archivos principales

- `supabase/migrations/20261004020000_mod11_notifications.sql`
- `supabase/tests/database/mod11_notifications.test.sql`
- `apps/mobile/src/modules/notification/`
- `apps/mobile/src/app/(app)/notifications.tsx`
- `apps/mobile/src/app/(app)/home.tsx`

## 11. Trazabilidad

`RF-097..RF-106` / `RNF-063..RNF-069` → este módulo → `IMP-013` → `TEST-350..TEST-399`.

## 12. Estado de validación

Reset local MOD-01..11, 11 archivos pgTAP / 683 aserciones (MOD-11 62/62), lint SQL, TypeScript, ESLint, 14 suites / 157 pruebas Jest, Expo Doctor 21/21, dependencias SDK 57, export web y `git diff --check` están en PASS. El dry-run enlazado propone únicamente `20261004020000_mod11_notifications.sql` y no aplicó cambios. `TEST-399` y push Android permanecen diferidos y no se registran como PASS.
