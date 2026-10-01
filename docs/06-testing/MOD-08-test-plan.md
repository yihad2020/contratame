# Contrátame! — Plan de pruebas de MOD-08

**Módulo:** `MOD-08 — Ciclo de vida de la contratación`

**Casos:** `TEST-220..TEST-259`

**Implementación:** `IMP-010`

**Estado:** Validación móvil aprobada; reset/pgTAP bloqueados por ausencia de Docker y Android/Supabase real diferidos

## 1. Estrategia

- pgTAP: contratos, grants/RLS, participantes, ubicación, lista, actores, secuencia, timestamps, historial, notificaciones, rollback y regresión.
- Jest: normalización, etiquetas, acciones, orden, payload, errores, fecha/hora y paginación.
- Aplicación: TypeScript, ESLint, Expo Doctor, dependencias SDK 57 y export web.
- Regresión: reset local y ocho archivos pgTAP; diez suites Jest.
- Supabase vinculado: solo `db push --dry-run`; sin despliegue.

## 2. Casos

| ID | Escenario esperado | Evidencia |
|---|---|---|
| `TEST-220` | Contratos, `SECURITY DEFINER`, `search_path`, grants y firmas son mínimos. | pgTAP |
| `TEST-221` | Customer participante lee booking `scheduled`. | pgTAP |
| `TEST-222` | Worker asignado lee booking `scheduled`. | pgTAP |
| `TEST-223` | Customer ajeno no lee detalle/ubicación. | pgTAP |
| `TEST-224` | Worker ajeno no lee detalle/ubicación. | pgTAP |
| `TEST-225` | Anónimo/no confirmado no lee ni transiciona. | pgTAP |
| `TEST-226` | Worker ejecuta `scheduled → in_progress`. | pgTAP |
| `TEST-227` | Customer/worker ajeno no inicia. | pgTAP |
| `TEST-228` | Inicio duplicado/stale se rechaza. | pgTAP |
| `TEST-229` | Worker ejecuta `in_progress → completion_pending`. | pgTAP |
| `TEST-230` | Customer/worker ajeno no solicita finalización. | pgTAP |
| `TEST-231` | Solicitud de finalización duplicada se rechaza. | pgTAP |
| `TEST-232` | Customer ejecuta `completion_pending → completed`. | pgTAP |
| `TEST-233` | Worker/customer ajeno no confirma. | pgTAP |
| `TEST-234` | Confirmación duplicada se rechaza. | pgTAP |
| `TEST-235` | `scheduled → completed` se rechaza. | pgTAP |
| `TEST-236` | `scheduled → completion_pending` se rechaza. | pgTAP |
| `TEST-237` | `in_progress → completed` se rechaza. | pgTAP |
| `TEST-238` | `completed` es terminal. | pgTAP |
| `TEST-239` | Cada transición agrega exactamente un historial. | pgTAP |
| `TEST-240` | Historial no admite mutación participante. | pgTAP |
| `TEST-241` | Timestamps del servidor aparecen en la columna exacta y preservan anteriores. | pgTAP |
| `TEST-242` | Ubicación exacta funciona para ambos participantes posbooking. | pgTAP |
| `TEST-243` | Ubicación exacta queda bloqueada a terceros y contratos públicos. | pgTAP |
| `TEST-244` | UPDATE directo de booking falla. | pgTAP |
| `TEST-245` | INSERT/UPDATE/DELETE directo de historial falla. | pgTAP |
| `TEST-246` | Relación request/accepted quote/booking no cambia. | pgTAP |
| `TEST-247` | Lista es determinística y minimizada. | pgTAP |
| `TEST-248` | Paginación y límites 1–20 funcionan. | pgTAP |
| `TEST-249` | Locks, estado esperado y rollback protegen carrera/stale. | pgTAP/inspección SQL |
| `TEST-250` | MOD-01 a MOD-07 conservan contratos y suites. | Suite completa |
| `TEST-251` | UUID, estado y payload numérico se normalizan. | Jest |
| `TEST-252` | Etiquetas españolas cubren estados congelados. | Jest |
| `TEST-253` | Elegibilidad de acción coincide con rol/estado. | Jest |
| `TEST-254` | Orden del ciclo excluye edges de cancelación no aprobados. | Jest |
| `TEST-255` | Detalle e historial se normalizan sin IDs privados. | Jest |
| `TEST-256` | Errores de autorización/stale/red son seguros. | Jest |
| `TEST-257` | Fecha/hora usa `America/La_Paz` y BOB tiene dos decimales. | Jest |
| `TEST-258` | Páginas se deduplican por booking. | Jest |
| `TEST-259` | `completed`/`cancelled` son read-only y ruta inválida no consulta. | Jest/revisión |

No se agregan pruebas de cancelación porque sus actores, edges y motivo no están definidos.

## 3. Ejecución

```powershell
npx --yes supabase@2.118.0 db reset --local
npx --yes supabase@2.118.0 test db

Set-Location apps/mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo install --check
npx expo export --platform web

Set-Location ../..
git diff --check
npx --yes supabase@2.118.0 db push --dry-run
```

El último comando es únicamente inspección. No ejecutar `db push` ni desplegar MOD-08.

## 4. Verificación manual diferida

La automatización no sustituye dos clientes/dos workers reales en Supabase de desarrollo ni el recorrido Android: lista, handoff desde solicitud, acciones por rol, doble toque, pérdida de red, actualización entre dos dispositivos, ubicación posbooking e historial. Si no se ejecuta, queda diferida y no se presenta como PASS.

## 5. Criterio de salida

Reset, ocho archivos pgTAP, TypeScript, lint, diez suites Jest, Expo Doctor, alineación, export, diff y dry-run deben aprobar. Integración real/Android pueden quedar pendientes solo si se registran expresamente.

## 6. Resultado — 2026-10-01

| Área | Resultado |
|---|---|
| Supabase local | **Bloqueado/no ejecutado:** Docker/daemon no está disponible; `db reset --local` no encuentra el pipe de Docker y `test db` recibe `ECONNREFUSED 127.0.0.1:54322`. |
| pgTAP | No ejecutado. Se agregaron **66 aserciones** MOD-08; no se atribuye PASS ni total acumulado. |
| TypeScript y ESLint | Aprobados. |
| Jest | **10 suites / 120 pruebas aprobadas**, sin snapshots. |
| Expo | Dependencias alineadas; Expo Doctor **21/21**. |
| Export web | Aprobado, incluidas las rutas de booking. |
| Dry-run vinculado | Aprobado; listó solo `20261001010000_mod08_booking_lifecycle.sql`, sin aplicar cambios. |
| Supabase real / Android | No ejecutado; diferido. |

MOD-08 no se marca como validado completamente mientras la migración y pgTAP no hayan corrido sobre una base local desechable.
