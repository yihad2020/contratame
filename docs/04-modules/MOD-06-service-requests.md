# MOD-06 — Solicitudes directas de servicio

**Estado:** Implementado; validación local automatizada aprobada, dry-run vinculado bloqueado y Android real diferido  
**Requisitos:** `RF-049..RF-057`, `RNF-033..RNF-038`  
**Pruebas:** `TEST-140..TEST-179`  
**Registro:** `IMP-008`

## 1. Objetivo y responsabilidades

MOD-06 implementa la primera transacción cliente → worker. El cliente parte de un perfil público elegible, selecciona un servicio real, describe el trabajo, indica preferencias aprobadas y registra la ubicación exacta privada. Cliente y worker reciben listas/detalles propios; el worker no accede a la ubicación exacta antes de booking.

## 2. Modelo congelado materializado

```text
profiles (cliente) ──N service_requests N── worker_profiles
                              │                    │
                              ├──1 service_request_locations
                              ├──1 conversations
                              └──N notifications (una creada en este flujo)

worker_services ──N service_requests
```

La migración materializa exactamente `service_requests`, `service_request_locations`, `conversations` y `notifications` ya definidas en el esquema congelado. No agrega entidades, estados o columnas. `messages` permanece para el módulo de chat futuro.

## 3. Contratos de base de datos

### `create_service_request(...)`

Recibe worker, servicio, descripción, zona, latitud/longitud y los campos congelados opcionales de fecha, hora, presupuesto y dirección. No recibe cliente ni estado. Verifica caller activo/confirmado, worker públicamente elegible, servicio/categoría activos y pertenencia; luego crea solicitud `pending`, ubicación, conversación `active` y notificación dentro de una transacción. Retorna solo `request_id` y `request_status`.

### `list_my_service_requests(p_perspective, p_offset, p_limit)`

Acepta `customer` o `worker`, deriva la participación desde `auth.uid()`, retorna una allowlist sin ubicación exacta y pagina con orden `created_at DESC, id DESC`.

### `get_my_service_request(p_request_id)`

Retorna detalle solo si el caller es cliente propietario o worker destinatario. Dirección y coordenadas se llenan únicamente para el cliente; al worker se devuelven `NULL`.

## 4. Flujo móvil

```text
Explorar → Perfil público → Solicitar servicio
        → elegir servicio + detalles + lugar
        → revisar → RPC atómica → éxito/detalle

Solicitudes → Como cliente | Como profesional → detalle autorizado
```

La ubicación actual requiere una acción explícita. Si el permiso se deniega, el mapa manual permanece disponible. El formulario no solicita fotos, urgencia, contacto ni campos inexistentes.

## 5. Seguridad y privacidad

- Todas las RPC usan `SECURITY DEFINER`, `search_path = ''`, objetos calificados y `auth.uid()`.
- `anon` no tiene acceso; `authenticated` carece de mutaciones directas.
- RLS limita solicitud/conversación a participantes, ubicación al cliente y notificación al receptor.
- El worker solo obtiene zona general antes de booking; una política futura de booking deberá habilitar acceso exacto explícitamente.
- El perfil público y marketplace no cambian y no reciben datos transaccionales.
- No se concede un bypass admin general ni exacto porque el modelo congelado de MOD-06 no define esa operación.

## 6. Estados

El constraint conserva `pending`, `quoted`, `accepted`, `rejected`, `cancelled`, `expired`. MOD-06 únicamente crea `pending` y presenta estados existentes. No implementa transiciones. `expires_at` queda nulo y no hay cancelación, porque ambas políticas carecen de regla aprobada.

## 7. Acompañantes sin UI futura

La conversación y notificación se crean porque la operación transaccional congelada las exige. No se implementan mensajes, chat, bandeja de notificaciones, push ni navegación hacia ellas.

## 8. Fuera de alcance

Cotización/revisiones, aceptación, booking, trabajo, cancelación, reseñas, chat/mensajes, push, favoritos, certificación y pagos. Tampoco se define auto-contratación: no existe una prohibición aprobada en la documentación congelada.

## 9. Validación actual

El reset local aplicó MOD-01 a MOD-06 y pgTAP aprobó **6 archivos / 331 aserciones**, incluidas **68/68** de MOD-06. Aprobaron TypeScript, ESLint, Jest (**8 suites / 82 pruebas**), Expo Doctor (**21/21**), alineación de dependencias, export web y `git diff --check`; sus avisos LF/CRLF son informativos.

El `db push --dry-run` no se ejecutó: el entorno rechazó contactar el proyecto vinculado por destino externo no verificado. No se intentó eludir el control y no se aplicó ninguna migración remota. Integración real con Supabase de desarrollo y Android permanecen diferidas.
