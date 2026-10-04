# Contrátame! — Requisitos de MOD-09: reseñas

**Módulo:** `MOD-09 — Reseñas`  
**Implementación:** `IMP-011`  
**Pruebas:** `TEST-260..TEST-299`  
**Estado:** Implementado; validación automatizada local aprobada, Android/Supabase real diferidos

## 1. Reglas aprobadas

- Solo el cliente participante puede reseñar al trabajador después de un booking `completed`.
- Existe como máximo una reseña por booking.
- La entidad congelada contiene únicamente `id`, `booking_id`, `rating`, `comment`, `created_at` y `updated_at`.
- `rating` es `smallint` entre 1 y 5; `comment` es opcional y no tiene mínimo/máximo aprobado.
- Cliente y trabajador se derivan del booking; el móvil no envía identidades ni estado.
- Promedio y conteo son datos derivados, nunca columnas canónicas del worker.
- Al no existir edición/eliminación aprobada, una reseña enviada es inmutable. La moderación final continúa pendiente.
- La identidad del autor no se publica porque el modelo congelado no autoriza exponerla.

## 2. Requisitos funcionales

### RF-076 — Crear una reseña elegible

El cliente podrá calificar un booking completado mediante una operación controlada. **Aceptación:** caller confirmado/activo, booking existente y bloqueado, caller igual a `customer_profile_id`, estado `completed`, rating 1–5 y relaciones derivadas del booking.

### RF-077 — Garantizar una reseña por booking

La base impedirá duplicados incluso ante envíos concurrentes. **Aceptación:** `UNIQUE(booking_id)`, lock del booking, comprobación controlada y ausencia de filas parciales.

### RF-078 — Normalizar el contenido aprobado

La aplicación y PostgreSQL normalizarán espacios del comentario sin truncarlo. **Aceptación:** comentario vacío/solo espacios se guarda `NULL`; texto válido se conserva; no se inventa límite; rating se valida en cliente, RPC y constraint.

### RF-079 — Mantener la reseña inmutable

MOD-09 no ofrecerá edición ni eliminación. **Aceptación:** no hay UI/RPC de mutación posterior, clientes sin DML directo y trigger de base bloquea `UPDATE`/`DELETE`.

### RF-080 — Consultar la reseña desde el booking

Cliente y worker participantes podrán leer la reseña asociada. **Aceptación:** contrato allowlist; terceros/anónimos/cuentas no activas no obtienen datos; booking completado sin reseña ofrece CTA solo al cliente.

### RF-081 — Presentar el formulario móvil

El cliente elegirá 1–5 estrellas y comentario opcional en español. **Aceptación:** contexto de worker/servicio/booking, selector accesible, validación, submitting, éxito, error seguro y recuperación de duplicado.

### RF-082 — Publicar reputación real segura

El perfil público elegible mostrará promedio, conteo y reseñas reales. **Aceptación:** salida acotada y paginable, orden `created_at DESC` con desempate estable, sin identidad/contacto del autor ni datos privados del booking.

### RF-083 — Preservar elegibilidad pública

Las reseñas no habilitarán un perfil no elegible. **Aceptación:** el contrato repite cuenta `active`, worker `approved`, ubicación y servicio/categoría activos; si deja de cumplir, no devuelve reputación.

### RF-084 — Notificar al trabajador

Una reseña creada generará una notificación persistente `review_received`. **Aceptación:** destinatario derivado del worker del booking, referencia a review, sin push; un fallo revierte review y notificación.

## 3. Requisitos no funcionales

### RNF-049 — Autorización y mínimo privilegio

RPC `SECURITY DEFINER`, `search_path = ''`, objetos calificados, `auth.uid()`, grants estrechos, sin `service_role` ni DML directo.

### RNF-050 — Integridad y concurrencia

Lock, constraint única, constraint de rating, FK, inmutabilidad y transacción protegen las reglas aun con clientes modificados o simultáneos.

### RNF-051 — Privacidad

Los contratos omiten correo, teléfono, Auth, identidad del reviewer, request, quote, descripción, dirección y coordenadas. Reviews no evaden MOD-05.

### RNF-052 — Rendimiento y paginación

Promedio/conteo se calculan en PostgreSQL y la lista pública se limita a 1–20; el perfil solicita diez recientes sin descargar todo el historial.

### RNF-053 — Compatibilidad y mantenibilidad

Expo SDK 57, TypeScript estricto, lógica pura separada, diseño existente y ninguna dependencia nueva.

### RNF-054 — Pruebas y trazabilidad

`RF-076..RF-084`, `RNF-049..RNF-054`, `MOD-09`, `TEST-260..TEST-299`, migración e `IMP-011` mantienen referencias y regresiones MOD-01..08.

## 4. Decisiones preservadas

- No se define edición, eliminación, respuesta del worker ni moderación administrativa.
- No existe límite aprobado para `comment`; no se inventa uno.
- La política final de moderación de reviews sigue pendiente.
- El marketplace no cambia ranking ni añade popularidad/recomendación; la integración de agregados en tarjetas queda diferida para evitar reemplazar el contrato MOD-04 en este módulo.

## 5. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-076..RF-084` | `MOD-09` | `TEST-260..TEST-299` | `IMP-011` |
| `RNF-049..RNF-054` | `MOD-09` | `TEST-260..TEST-299` | `IMP-011` |

## 6. Evidencia de aceptación

- Reset local reproducible con migraciones `MOD-01..MOD-09`: aprobado.
- pgTAP: **9 archivos / 537 aserciones**, incluidas **60/60** de MOD-09.
- TypeScript, ESLint, Jest (**11 suites / 130 pruebas**), Expo Doctor (**21/21**), dependencias Expo y export web: aprobados.
- Lint de esquemas `public,private`: sin errores.
- `db push --dry-run`: identifica únicamente `20261001020000_mod09_reviews.sql`; no se aplicó remotamente.
- La prueba manual Android contra Supabase real continúa diferida y no se registra como aprobada.
