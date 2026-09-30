# Contrátame! — Plan de pruebas de MOD-07

**Módulo:** `MOD-07 — Cotizaciones, revisiones y aceptación`  
**Casos:** `TEST-180..TEST-219`  
**Implementación:** `IMP-009`  
**Estado:** Validación local automatizada y dry-run aprobados; integración real y Android diferidos

## 1. Estrategia

- pgTAP: entidades/contratos, grants/RLS, actores, elegibilidad, revisiones inmutables, estados, locks/unicidad, lectura participante, horario autoritativo, booking, historial, notificaciones, rollback y ubicación.
- Jest: dinero, formulario, vigencia, payload, normalización, orden, revisión actual, precarga, horario final, elegibilidad, estados y errores.
- Aplicación: TypeScript, ESLint, Expo Doctor, alineación SDK 57 y export web.
- Regresión: reset local y siete suites pgTAP; nueve suites Jest.
- Supabase vinculado: únicamente `db push --dry-run`; MOD-07 no se despliega.
- Android/Supabase real: verificación manual separada, sin `service_role` ni coordenadas/tokens en evidencia.

## 2. Casos

| ID | Escenario esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-180` | Tablas, columnas, estados, FKs, índices, RPC, `SECURITY DEFINER`, `search_path`, grants y RLS coinciden con el contrato. | `RNF-039`, `RNF-040` | pgTAP |
| `TEST-181` | Worker destinatario aprobado crea la primera quote. | `RF-058` | pgTAP |
| `TEST-182` | Actor worker se deriva de `auth.uid()`; la firma no acepta worker/revisión/status. | `RF-058`, `RNF-039` | pgTAP |
| `TEST-183` | Worker ajeno no cotiza la solicitud. | `RF-058` | pgTAP |
| `TEST-184` | Cliente no crea quote. | `RF-058` | pgTAP |
| `TEST-185` | Anónimo, no confirmado y suspendido no cotizan. | `RF-058`, `RNF-039` | pgTAP |
| `TEST-186` | Quote pertenece a la solicitud correcta y revision 1 inicia `pending`. | `RF-058` | pgTAP |
| `TEST-187` | Monto inválido, cero, fuera de rango o con más de dos decimales se rechaza. | `RF-058` | pgTAP/Jest |
| `TEST-188` | Vigencia opcional exige fecha/hora juntas y futuro. | `RF-058` | pgTAP/Jest |
| `TEST-189` | Primera quote cambia request `pending → quoted`. | `RF-058` | pgTAP |
| `TEST-190` | Segunda revisión crea fila 2 sin sobrescribir fila 1. | `RF-059` | pgTAP |
| `TEST-191` | Revisión anterior conserva monto/mensaje y cambia únicamente a `superseded`. | `RF-059` | pgTAP |
| `TEST-192` | Unicidad y lock protegen números y una sola revisión vigente ante carreras. | `RF-059`, `RNF-040` | pgTAP/inspección SQL |
| `TEST-193` | Contenido/status históricos no admiten UPDATE/DELETE directo participante. | `RF-059`, `RNF-039` | pgTAP |
| `TEST-194` | Requests accepted/cancelled/rejected/expired o temporalmente vencidas no reciben quote. | `RF-059` | pgTAP |
| `TEST-195` | Cliente propietario consulta historial completo y ordenado. | `RF-060` | pgTAP |
| `TEST-196` | Worker destinatario consulta historial permitido. | `RF-060` | pgTAP |
| `TEST-197` | Cliente/worker ajeno no consulta historial. | `RF-060`, `RNF-041` | pgTAP |
| `TEST-198` | Historial identifica exactamente una revisión actual y devuelve handoff solo al aceptar. | `RF-060` | pgTAP/Jest |
| `TEST-199` | Cliente propietario acepta revisión vigente, pendiente y no vencida. | `RF-061` | pgTAP |
| `TEST-200` | Cliente ajeno no acepta quote de otra solicitud. | `RF-061` | pgTAP |
| `TEST-201` | Worker no acepta quote. | `RF-061` | pgTAP |
| `TEST-202` | Revisión `superseded`, vencida, no actual o solicitud terminal no se acepta. | `RF-061` | pgTAP |
| `TEST-203` | Segunda aceptación falla y no sustituye quote/booking aceptados. | `RF-061`, `RNF-040` | pgTAP |
| `TEST-204` | Dos aceptaciones y revisión contra aceptación se serializan por request lock y constraints. | `RF-061`, `RNF-040` | pgTAP/inspección SQL |
| `TEST-205` | Precarga conserva las cuatro combinaciones de preferencias y permite edición cliente. | `RF-062` | Jest/manual |
| `TEST-206` | Fecha/hora final incompleta, inválida o pasada deshabilita/rechaza aceptación. | `RF-062` | pgTAP/Jest/manual |
| `TEST-207` | Payload envía date/time y omite `scheduled_at` calculado por cliente. | `RF-062`, `RNF-039` | pgTAP/Jest |
| `TEST-208` | Backend construye `scheduled_at` con `America/La_Paz` y `timestamptz`. | `RF-062` | pgTAP |
| `TEST-209` | Preferencias originales permanecen sin cambios al aceptar. | `RF-062` | pgTAP |
| `TEST-210` | Aceptación crea booking `scheduled`, snapshot de servicio/precio e historial inicial. | `RF-063` | pgTAP |
| `TEST-211` | Notificaciones o companion fallidos revierten quote, request, booking e historial completos. | `RF-063`, `RNF-040` | pgTAP |
| `TEST-212` | Worker ve ubicación exacta solo después del booking; cliente la conserva y terceros no. | `RF-066`, `RNF-041` | pgTAP/integración |
| `TEST-213` | Formulario worker valida/normaliza dinero, mensaje y vigencia; payload omite actor/estado/revisión. | `RF-064` | Jest |
| `TEST-214` | Orden y selección actual son determinísticos aun ante input defensivo duplicado. | `RF-060`, `RNF-042` | Jest |
| `TEST-215` | Elegibilidad cliente exige perspectiva, request quoted, revisión current/pending y vigencia. | `RF-061`, `RF-065` | Jest |
| `TEST-216` | Etiquetas cubren exactamente los seis estados congelados y BOB se presenta correctamente. | `RF-065` | Jest |
| `TEST-217` | Errores de autorización, stale, validación y red se traducen sin SQL crudo. | `RNF-041`, `RNF-042` | Jest |
| `TEST-218` | UI worker/cliente, confirmación, submitting, éxito y handoff funcionan en Android real. | `RF-064`, `RF-065` | Manual diferida |
| `TEST-219` | MOD-01 a MOD-06 conservan migraciones, contratos y suites; controles estáticos/Expo/export pasan. | `RNF-043` | Suite completa |

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

El último comando es solo inspección. No ejecutar `db push` ni aplicar MOD-07 remotamente.

## 4. Validación manual pendiente

La automatización no sustituye una prueba con dos clientes y dos workers reales en Supabase de desarrollo ni el recorrido Android: creación/revisión, historia, refresco, confirmación de horario con las cuatro combinaciones de preferencias, doble toque, pérdida de red, aceptación, ubicación antes/después del booking y handoff visual. Si no se ejecuta, permanece diferida y no se presenta como PASS.

## 5. Criterio de salida

Reset, siete archivos pgTAP, TypeScript, lint, nueve suites Jest, Expo Doctor, alineación, export y diff deben aprobar. El dry-run debe listar solo `20260930010000_mod07_quotes.sql` sin aplicarlo. Integración real y Android pueden quedar pendientes si se registran expresamente.

## 6. Resultado — 2026-09-30

| Área | Resultado |
|---|---|
| Supabase local | Reset aprobado; aplicó MOD-01 a MOD-07. |
| pgTAP | **7 archivos / 411 aserciones aprobadas**; MOD-07 aprobó **80/80**. |
| Jest | **9 suites / 104 pruebas aprobadas**, sin snapshots. |
| TypeScript y ESLint | Aprobados. |
| Expo | Dependencias alineadas; Expo Doctor **21/21**. |
| Export web | Aprobado. |
| `git diff --check` | Aprobado. |
| Dry-run vinculado | Aprobado; listó solo `20260930010000_mod07_quotes.sql` y no aplicó cambios. |
| Supabase real / Android | No ejecutado; diferido. |
