# MOD-12 — Plan de pruebas

**Estado:** IMPLEMENTED / EXECUTION PENDING  
**Pruebas:** `TEST-400..TEST-449`

| ID | Verificación | Trazabilidad |
|---|---|---|
| TEST-400 | Entidad frozen `favorites`, PK/FK/default. | RF-107 |
| TEST-401 | RLS, grants, `SECURITY DEFINER`, search path. | RNF-070 |
| TEST-402 | Anon/no confirmado/suspendido no agrega. | RF-107 |
| TEST-403 | Owner derivado y duplicado idempotente. | RF-107 |
| TEST-404 | Worker no público no se agrega. | RF-109 |
| TEST-405 | Estado y aislamiento cross-user. | RF-108 |
| TEST-406 | Paginación determinista y límites. | RNF-073 |
| TEST-407 | Worker que deja de ser público se minimiza. | RF-109, RNF-071 |
| TEST-408 | Placeholder puede eliminarse sin afectar a otro owner. | RF-108 |
| TEST-409 | DML directo de favoritos falla. | RNF-070 |
| TEST-410 | UI/modelo normaliza, mezcla y elimina favoritos. | RF-109 |
| TEST-411 | Estados loading/empty/error/retry de favoritos. | RNF-075 |
| TEST-412 | Entidad frozen `user_reports`, FK/defaults/checks. | RF-114 |
| TEST-413 | RLS y ausencia de DML directo de reportes. | RNF-070 |
| TEST-414 | Siete RPCs hardened y grants mínimos. | RNF-070 |
| TEST-415 | Anon/no confirmado/suspendido no reporta. | RF-110 |
| TEST-416 | Self-report falla. | RF-110 |
| TEST-417 | Perfil exige worker público. | RF-111 |
| TEST-418 | Perfil admite solo tres reasons. | RF-111 |
| TEST-419 | Booking admite siete reasons. | RF-112 |
| TEST-420 | Booking exige participación. | RF-112 |
| TEST-421 | Contraparte se deriva, no se recibe. | RF-112 |
| TEST-422 | Descripción normaliza whitespace. | RF-113 |
| TEST-423 | Límites 20/2.000 y Unicode en DB. | RF-113 |
| TEST-424 | Límites y Unicode en TypeScript. | RNF-074 |
| TEST-425 | Alta asigna `open` sin revisión. | RF-114 |
| TEST-426 | Unicidad permanente incluye contexto NULL. | RF-115 |
| TEST-427 | Reporter lista solo propias. | RF-116 |
| TEST-428 | Reporter abre solo detalle propio. | RF-116 |
| TEST-429 | Allowlist omite reviewer/notas/contacto/ubicación. | RNF-071 |
| TEST-430 | Lista reporter usa cursor estable/límite. | RNF-073 |
| TEST-431 | Reported no obtiene acceso directo. | RF-116 |
| TEST-432 | Non-admin no lista reportes administrativos. | RF-117 |
| TEST-433 | Admin filtra cuatro estados. | RF-117 |
| TEST-434 | Lista admin paginada determinísticamente. | RNF-073 |
| TEST-435 | Detail admin expone contexto necesario seguro. | RF-117 |
| TEST-436 | Non-admin no modera. | RF-118 |
| TEST-437 | `open→under_review` sin notas. | RF-118 |
| TEST-438 | `open→resolved/dismissed` con notas. | RF-118 |
| TEST-439 | `under_review→resolved/dismissed`. | RF-118 |
| TEST-440 | Reapertura/transición arbitraria falla. | RF-118 |
| TEST-441 | Notas normalizan y validan 10–1.000 Unicode. | RF-118 |
| TEST-442 | Actor y hora son server-derived. | RF-119 |
| TEST-443 | Row lock y estado post-lock rechazan stale. | RF-119 |
| TEST-444 | Cada transición agrega audit semántico. | RF-120 |
| TEST-445 | Transición y audit son atómicos. | RNF-072 |
| TEST-446 | Terminal inmutable. | RF-118 |
| TEST-447 | No hay sanción ni notificación inventada. | RF-121 |
| TEST-448 | Mobile/admin typecheck, lint, unit tests y builds. | RNF-077 |
| TEST-449 | Android real valida persistencia, entradas y flujos; Supabase real valida RLS/concurrencia. | RNF-075, RNF-077 |

## Comandos de cierre

Reset local, suite pgTAP completa y lint `public,private`; en mobile TypeScript, ESLint, Jest, Expo Doctor, alineación y export web; en admin TypeScript, ESLint, Vitest y build; en raíz `git diff --check` y `db push --dry-run`. El dry-run no despliega. `TEST-449` requiere confirmación explícita y no puede inferirse de pruebas automatizadas.

