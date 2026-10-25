# MOD-12 — Requisitos de Favoritos, Reportes y Moderación Administrativa

**Estado:** IMPLEMENTED / VALIDATION PENDING  
**Trazabilidad:** `RF-107..RF-121`, `RNF-070..RNF-078` → `MOD-12` → `TEST-400..TEST-449` → `IMP-014`

## Alcance aprobado

MOD-12 materializa únicamente las entidades congeladas `favorites` y `user_reports`, y reutiliza `audit_logs`. No agrega sanciones, evidencia adjunta, almacenamiento, nuevos roles ni autenticación administrativa.

## Requisitos funcionales

### RF-107 — Agregar favorito
Una cuenta activa y confirmada puede guardar un worker actualmente elegible para publicación; la identidad se deriva de `auth.uid()` y la repetición es idempotente. **CA:** queda una sola fila `(profile_id, worker_id)` y no se genera solicitud, conversación, booking ni notificación.

### RF-108 — Quitar y consultar favorito
El propietario puede consultar estado y eliminar su favorito incluso si el worker dejó de ser público. **CA:** la eliminación repetida es segura y ninguna operación afecta favoritos ajenos.

### RF-109 — Lista privada de favoritos
La app muestra la lista real, paginada y persistente del usuario. **CA:** un worker elegible enlaza a su perfil; uno no disponible aparece como placeholder removible sin datos previamente públicos ni privados.

### RF-110 — Entrada de reporte
Una cuenta activa y confirmada puede reportar desde un perfil público elegible o desde un booking propio. **CA:** no existen entradas desde solicitudes, conversaciones ni mensajes; el reporter siempre es `auth.uid()` y no puede reportarse a sí mismo.

### RF-111 — Reporte de perfil
El contexto profile-only usa `booking_id = NULL`, deriva el perfil desde un worker públicamente elegible y admite `misleading_profile`, `inappropriate_behavior` u `other`. **CA:** targets no públicos y otros motivos son rechazados por PostgreSQL.

### RF-112 — Reporte de booking
Un participante puede reportar exclusivamente a la contraparte del booking y usar cualquiera de los siete motivos aprobados. **CA:** terceros son rechazados; el reporte sigue siendo válido si la contraparte luego deja de ser pública.

### RF-113 — Descripción del reporte
La descripción es obligatoria, normaliza espacios y contiene 20–2.000 caracteres Unicode. **CA:** cliente y servidor rechazan vacío, corto o excedente; usan conteo por code points y nunca truncan.

### RF-114 — Creación privada e inmutable
PostgreSQL crea cada reporte en `open`; el reporter no controla estado, reviewer, fecha ni notas y luego no puede editar o borrar. **CA:** no hay DML directo cliente y la fila conserva target, contexto, motivo y descripción.

### RF-115 — Duplicado permanente
Es única la combinación reporter, reported, booking incluido `NULL`, reason. **CA:** el constraint DB rechaza duplicados aun después de estado terminal; distinto motivo o booking sí se admite.

### RF-116 — Lectura del reporter
El reporter lista y abre solo sus reportes con allowlist segura. **CA:** puede ver ID, contexto seguro, booking propio, motivo, descripción, estado, creación y revisión; nunca reviewer, notas internas, contacto ni coordenadas.

### RF-117 — Bandeja administrativa
El admin autenticado mediante `user_roles` lista con filtro/orden/paginación y abre el contexto seguro necesario. **CA:** un usuario normal no ejecuta estos contratos ni ve datos de moderación.

### RF-118 — Transiciones administrativas
Solo se permiten `open→under_review|resolved|dismissed` y `under_review→resolved|dismissed`. **CA:** terminales son inmutables; under-review conserva notas `NULL`; resolved/dismissed exige notas normalizadas de 10–1.000 caracteres Unicode.

### RF-119 — Identidad, concurrencia y atomicidad
La DB deriva admin y hora, bloquea la fila, revalida el estado y actualiza atómicamente. **CA:** intentos stale/duplicados fallan sin cambio parcial.

### RF-120 — Auditoría administrativa
Cada transición exitosa agrega `user_report.<status>` a `audit_logs`. **CA:** actor, reporte, estado previo/resultante y timestamp provienen del servidor y el evento es append-only.

### RF-121 — Sin sanciones automáticas
Resolver o desestimar concluye solo el caso administrativo. **CA:** no suspende cuentas/workers, cancela bookings, altera solicitudes/reviews/chat/rating ni oculta perfiles.

## Requisitos no funcionales

### RNF-070 — Autorización en base de datos
RLS, grants mínimos, funciones `SECURITY DEFINER` con `search_path` vacío e identidad derivada protegen ambos dominios. **CA:** anon, cross-user y non-admin fallan en DB.

### RNF-071 — Privacidad y minimización
Los contratos exponen allowlists sin contacto, coordenadas, ubicación privada ni notas internas al reporter. **CA:** tests inspeccionan campos retornados y placeholders.

### RNF-072 — Integridad transaccional
Constraints y RPCs mantienen unicidad, estados, longitudes, locks y auditoría atómica. **CA:** un error no deja transición ni audit parciales.

### RNF-073 — Rendimiento acotado
Listas usan índices, límites 1–50 y cursores deterministas `(created_at,id)` o `(created_at,worker_id)`. **CA:** páginas adyacentes no se superponen y no hay N+1.

### RNF-074 — Tipado y validación Unicode
TypeScript estricto refleja reasons/status/context y valida con `Array.from`; DB usa `char_length`. **CA:** límites y emoji están cubiertos.

### RNF-075 — Usabilidad Android
Favoritos/reportes tienen loading, vacío, error/retry, confirmación explícita y touch targets coherentes. **CA:** la UI no oculta errores ni simula datos.

### RNF-076 — Seguridad administrativa
La app Next.js reutiliza Supabase Auth y `user_roles`; no incluye service role. **CA:** la identidad administrativa no es parámetro cliente.

### RNF-077 — Regresión
MOD-12 preserva contratos/RLS de MOD-01..MOD-11. **CA:** reset, suite pgTAP completa y validaciones mobile/admin deben pasar antes de cierre.

### RNF-078 — Trazabilidad
Requisitos, módulo, migraciones, pruebas e `IMP-014` quedan enlazados. **CA:** no se declara COMPLETE mientras falle o no pueda ejecutarse una validación obligatoria.

## Fuera de alcance y pendientes

Adjuntos/evidencia, Storage, sanciones, bans, cancelaciones, eliminación de contenido, reputación, notificaciones de moderación, certificación, pagos y reglas de retención. La retención de reportes/auditoría no está aprobada y no se inventa.

