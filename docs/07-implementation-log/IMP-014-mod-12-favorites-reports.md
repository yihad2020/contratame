# IMP-014 — Primera implementación de MOD-12

**Fecha:** 2026-10-22  
**Módulo:** `MOD-12 — Favoritos, Reportes y Moderación Administrativa`  
**Requisitos:** `RF-107..RF-121`, `RNF-070..RNF-078`  
**Pruebas:** `TEST-400..TEST-449`  
**Estado:** IN PROGRESS / VALIDATION BLOCKED

## Implementación

- Materialización frozen de `favorites` y `user_reports`, sin nuevas entidades.
- Favoritos owner-only con alta/remoción/estado/lista keyset y placeholder privado para workers no disponibles.
- Reportes profile-only y booking-context, reasons exactos, descripciones Unicode 20–2.000, estado DB `open` y unicidad permanente incluida la variante NULL.
- Lectura reporter mediante allowlist y lista/detalle; ninguna lectura para el perfil reportado.
- Moderación admin mediante RPC única con grafo cerrado, notas 10–1.000, row lock, rechazo stale y audit atómico.
- UI móvil para favoritos, reportes desde perfil/booking y seguimiento propio.
- UI Next.js para lista, filtros, detalle, revisión y cierre.
- Sin service role, evidencia adjunta, Storage, sanción ni consecuencia automática.

## Validación actual

| Control | Resultado |
|---|---|
| Reset local MOD-01..MOD-12 | **BLOCKED**: Docker Desktop no está ejecutándose; no existe el pipe `dockerDesktopLinuxEngine`. |
| pgTAP | **PENDING** hasta disponer de Supabase local; archivo MOD-12 declara 119 aserciones y la suite completa esperada sería 12 archivos / 802 aserciones. |
| Lint SQL | **PENDING** hasta disponer de Supabase local. |
| Mobile TypeScript / ESLint | **PASS**. |
| Mobile Jest | **PASS**: 16 suites / 173 pruebas. |
| Expo web export | **PASS**. |
| Expo Doctor | **FAIL**: 20/21; el catálogo vigente pide nueve actualizaciones patch de Expo SDK 57 ajenas a MOD-12. |
| Expo dependency check | **FAIL**: las mismas nueve revisiones patch se reportan desactualizadas. |
| Admin TypeScript / ESLint | **PASS**. |
| Admin Vitest | **PASS**: 2 archivos / 6 pruebas. |
| Admin production build | **PASS**. |
| `git diff --check` | **PASS**. |
| Dry-run enlazado | **BLOCKED**: el rol temporal remoto no pudo crearse por timeout de conexión; no aplicó cambios. |
| Android real / Supabase real | **PENDING**; no se infiere de automatización. |

No se realizó commit, push ni despliegue remoto. Este registro no declara MOD-12 completo mientras persista una validación obligatoria pendiente o fallida.

