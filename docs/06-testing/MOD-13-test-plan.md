# MOD-13 — Plan de pruebas

**Estado:** AUTOMATED VALIDATION COMPLETE / MANUAL E2E DEFERRED  
**Pruebas:** `TEST-450..TEST-499`

| ID | Verificación | Trazabilidad |
|---|---|---|
| TEST-450 | Entidad frozen, columnas, PK/FK y defaults. | RF-124 |
| TEST-451 | Checks de estados, precio y coherencia de fechas. | RNF-080 |
| TEST-452 | Índices pending, active, worker, estado y vigencia. | RNF-082 |
| TEST-453 | RLS y ausencia de DML directo. | RNF-079 |
| TEST-454 | RPCs existen, son definer y fijan search path vacío. | RNF-079 |
| TEST-455 | Anon carece de ejecución. | RF-123 |
| TEST-456 | Cuenta no confirmada falla cerrada. | RF-123 |
| TEST-457 | Cuenta suspendida/deactivated falla cerrada. | RF-123 |
| TEST-458 | Worker draft no solicita. | RF-123 |
| TEST-459 | Worker pending no solicita. | RF-123 |
| TEST-460 | Worker rejected/suspended no solicita. | RF-123 |
| TEST-461 | Worker aprobado consulta eligible. | RF-122 |
| TEST-462 | Owner se deriva de Auth y no es parámetro. | RF-124 |
| TEST-463 | Precio Bs 50 proviene del servidor. | RF-124 |
| TEST-464 | Solicitud inicia pending_payment sin fechas. | RF-124 |
| TEST-465 | Pending duplicado se rechaza. | RF-125 |
| TEST-466 | Active vigente impide nueva solicitud. | RF-125 |
| TEST-467 | Tercero no solicita para otro worker. | RF-123 |
| TEST-468 | Usuario no falsifica estado/fechas/precio. | RNF-079 |
| TEST-469 | Historia no puede borrarse por cliente. | RF-125 |
| TEST-470 | Non-admin no lista certificaciones. | RF-126 |
| TEST-471 | Non-admin no aprueba ni rechaza. | RF-127, RF-128 |
| TEST-472 | Admin filtra cuatro estados frozen. | RF-126 |
| TEST-473 | Lista admin usa cursor y límite. | RNF-082 |
| TEST-474 | Detalle admin devuelve contexto seguro. | RF-126 |
| TEST-475 | Allowlist admin omite contacto/ubicación. | RNF-081 |
| TEST-476 | Admin aprueba pending actual. | RF-127 |
| TEST-477 | Aprobación revalida elegibilidad. | RF-127 |
| TEST-478 | Inicio es tiempo PostgreSQL. | RNF-083 |
| TEST-479 | Vencimiento es exactamente +12 meses. | RF-127 |
| TEST-480 | Aprobación crea audit con actor servidor. | RF-134 |
| TEST-481 | Decisión y audit son atómicos. | RF-134 |
| TEST-482 | Revisión stale/duplicada falla. | RNF-080 |
| TEST-483 | Admin rechaza pending. | RF-128 |
| TEST-484 | Rechazo usa cancelled y fechas nulas. | RF-128 |
| TEST-485 | Rechazo crea audit derivado. | RF-134 |
| TEST-486 | Rechazo habilita reaplicación sin cooldown. | RF-131 |
| TEST-487 | Vencimiento habilita reaplicación. | RF-131 |
| TEST-488 | Reaplicación preserva historia. | RF-125, RF-131 |
| TEST-489 | Badge aparece durante vigencia. | RF-129 |
| TEST-490 | Badge no aparece pending/rejected. | RF-129 |
| TEST-491 | Badge no aparece tras vencimiento sin cron. | RF-130 |
| TEST-492 | Badge desaparece al perder elegibilidad. | RF-129 |
| TEST-493 | Badge reaparece si elegibilidad vuelve antes de vencer. | RF-129 |
| TEST-494 | Contrato público expone solo worker/badge/vencimiento. | RNF-081 |
| TEST-495 | Batch público deduplica y limita entradas. | RNF-082 |
| TEST-496 | Jest cubre estados, precio, badge y errores. | RNF-084 |
| TEST-497 | Vitest cubre etiquetas y terminalidad admin. | RNF-084 |
| TEST-498 | Reset, pgTAP, lint, tipos, ESLint, tests y builds regresan MOD-01..12. | RNF-085 |
| TEST-499 | Android real y Supabase vinculado verifican flujo completo/RLS; no se infiere automáticamente. | RNF-086 |

## Comandos de cierre

Se ejecutan reset, pgTAP y lint `public,private`; en mobile TypeScript, ESLint, Jest, Expo Doctor, alineación y export web; en admin TypeScript, ESLint, Vitest y build; en raíz `git diff --check` y `db push --dry-run`. El dry-run no despliega.

La verificación Android real y la integración funcional contra Supabase de desarrollo permanecen manuales si no existe confirmación explícita.

## Resultado de validación

| Área | Resultado |
|---|---|
| Supabase local | Reset aprobado; aplicó MOD-01 a MOD-13. |
| pgTAP | **13 archivos / 886 aserciones PASS**; MOD-13 **84/84**. |
| Esquema | Lint `public,private`: `No schema errors found`. |
| Mobile TypeScript / ESLint | PASS. |
| Mobile Jest | **17 suites / 178 pruebas PASS**. |
| Expo | Dependencias alineadas; Doctor **21/21**; export web PASS. |
| Admin TypeScript / ESLint | PASS. |
| Admin Vitest | **3 archivos / 10 pruebas PASS**. |
| Next.js | Build de producción PASS; rutas `/certifications` y detalle incluidas. |
| Dry-run vinculado | Listó únicamente `20261011010000_mod13_certification.sql`; no desplegó. |
| Diff | `git diff --check` PASS. |
| Android / Supabase funcional real | No confirmado; diferido a integración móvil/E2E. |

