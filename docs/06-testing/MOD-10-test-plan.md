# Contrátame! — Plan de pruebas de MOD-10

**Casos:** `TEST-300..TEST-349`  
**Implementación:** `IMP-012`  
**Estado:** Validación automatizada completa; verificación manual diferida

## 1. Estrategia

- pgTAP: entidad, constraints, contratos, RLS/grants, participantes, cierre, contenido 1–2.000, Unicode, idempotencia, privacidad, keyset, Realtime, notificación/rollback y regresión.
- Jest: normalización/Unicode, payload, sender, orden, deduplicación, cursores de reconexión, inbox/vacío y errores seguros.
- Mobile/manual: bandeja, conversación, teclado Android, reconexión, doble toque y dos sesiones reales.

## 2. Casos

| IDs | Cobertura |
|---|---|
| `TEST-300..304` | Entidad congelada, tipos, FK, checks e índice. |
| `TEST-305..309` | RPC endurecidas, grants, RLS y publicación Realtime. |
| `TEST-310..314` | Customer/worker participantes; customer/worker ajenos y anon bloqueados. |
| `TEST-315..319` | Caller activo/confirmado, sender derivado, suplantación/cross-conversation bloqueadas. |
| `TEST-320..324` | Vacío, whitespace, exactos 2.000, 2.001, Unicode y sin truncar. |
| `TEST-325..329` | Persistencia, timestamp, text/system, cierre legible/no escribible. |
| `TEST-330..334` | UUID idempotente, conflicto, doble toque y notificación única/atómica. |
| `TEST-335..339` | Historia/inbox keyset, orden estable, límites y previews. |
| `TEST-340..344` | Privacidad, DML/participantes inmutables, RLS Realtime y cuenta suspendida. |
| `TEST-345..349` | Merge/dedupe, cursores/reconexión, empty/error móvil y regresión MOD-01..09. |

## 3. Validación específica de longitud

| Entrada normalizada | Resultado |
|---|---|
| vacía | Rechazo servidor/móvil. |
| solo whitespace | Rechazo después de normalizar. |
| 2.000 Unicode | Aceptada completa. |
| 2.001 Unicode | Rechazada, sin truncar. |
| emoji/caracteres multibyte | Conteo por carácter: `char_length()` y `Array.from`. |
| `system` | Conserva comportamiento congelado; la nueva regla aplica solo a user `text`. |

## 4. Ejecución

```powershell
npx --yes supabase@2.118.0 db reset --local
npx --yes supabase@2.118.0 test db
npx --yes supabase@2.118.0 db lint --local --schema public,private --level warning --fail-on error

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

El último comando solo inspecciona. No se aplican migraciones remotamente.

### Evidencia 2026-10-04

| Control | Resultado |
|---|---|
| Reset local | **PASS**: aplicó MOD-01 a MOD-10 desde cero. |
| pgTAP | **PASS**: 10 archivos / 621 aserciones; MOD-10 84/84. |
| Schema lint | **PASS**: `public/private`, sin errores. |
| TypeScript | **PASS** (`npx tsc --noEmit`). |
| ESLint | **PASS** (`npm run lint`). |
| Jest | **PASS**: 12 suites / 142 pruebas. |
| Expo Doctor | **PASS**: 21/21. |
| Dependencias Expo | **PASS**: alineadas con SDK 57. |
| Expo web export | **PASS**. |
| `git diff --check` | **PASS**. |
| Migration dry-run | **PASS** como inspección: lista únicamente `20261004010000_mod10_chat.sql`; no aplicó cambios. |

## 5. Verificación manual diferida

Android/Supabase real deberá probar dos sesiones customer/worker, aislamiento cruzado, envío simultáneo/doble toque, pérdida y recuperación de red, background/foreground, cleanup al navegar, carga anterior, conversación cerrada, teclado y contador. Hasta ejecutarlo no se registra PASS.

