# MOD-12 — Favoritos, Reportes y Moderación Administrativa

**Estado:** IMPLEMENTED / VALIDATION PENDING  
**Requisitos:** `RF-107..RF-121`, `RNF-070..RNF-078`  
**Implementación:** `IMP-014`

## Responsabilidades

- Mantener favoritos privados del usuario y mostrar únicamente workers actualmente públicos; los no disponibles se minimizan a un placeholder removible.
- Crear reportes inmutables en dos contextos aprobados: perfil público y booking participante.
- Ofrecer al reporter lista/detalle seguros y al admin bandeja, filtros, detalle y acciones controladas.
- Aplicar el grafo de moderación con lock, validación post-lock, identidad/tiempo servidor y auditoría atómica.
- Garantizar que una decisión no produzca consecuencias automáticas.

## Contratos de datos

`favorites` conserva exactamente `profile_id`, `worker_id`, `created_at`. RPCs: `get_my_worker_favorite_state`, `add_worker_favorite`, `remove_worker_favorite`, `list_my_worker_favorites`.

`user_reports` conserva las doce columnas congeladas. RPCs móviles: `create_profile_report`, `create_booking_report`, `list_my_user_reports`, `get_my_user_report`. RPCs admin: `list_admin_user_reports`, `get_admin_user_report`, `transition_user_report`.

La unicidad `NULLS NOT DISTINCT` incluye `booking_id = NULL`. Todas las listas son acotadas y ordenadas por cursor estable. No existe acceso DML directo a las tablas desde clientes autenticados.

## Seguridad y privacidad

Las funciones son `SECURITY DEFINER`, fijan `search_path = ''`, cualifican objetos y derivan caller/admin desde `auth.uid()`. La cuenta debe estar activa y confirmada. `user_roles` es la única fuente del privilegio admin. El reported no recibe acceso al registro. El reporter nunca recibe reviewer/notas internas/contacto/ubicación. El admin recibe contexto de reporte/booking, no coordenadas ni contacto.

## Flujo de reporte

1. La UI valida motivo y descripción normalizada.
2. La RPC vuelve a validar cuenta, target/contexto, participación, reason y 20–2.000 caracteres con `char_length`.
3. PostgreSQL deriva reporter/contraparte y crea `open`; cualquier fallo revierte la operación.
4. El admin puede pasar a `under_review` sin notas o terminar en `resolved`/`dismissed` con 10–1.000 caracteres.
5. Cada transición bloquea la fila y agrega el evento audit en la misma transacción.

## UI

Mobile añade favorito y reporte al perfil público, reporte al detalle de booking, listas de favoritos/reportes y detalle seguro del reporte. Admin añade navegación, lista filtrada/paginada, detalle y formularios de revisión/resolución. No hay entrada desde request/chat/message.

## Exclusiones

No hay evidencia adjunta, Storage, notificación nueva, sanción, suspensión, cancelación, eliminación de contenido, cambio de reputación, certificación, pago ni rediseño. Retención permanece pendiente.

## Trazabilidad

`RF-107..RF-121` / `RNF-070..RNF-078` → migraciones `20261004030000_mod12_favorites.sql` y `20261004040000_mod12_reports_moderation.sql` → `TEST-400..TEST-449` → `IMP-014`.

