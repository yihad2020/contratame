# Contrátame! — Plan de pruebas de MOD-09

**Casos:** `TEST-260..TEST-299`  
**Implementación:** `IMP-011`  
**Estado:** Validación automatizada local aprobada; manual Android/Supabase real diferida

## 1. Estrategia

- pgTAP: entidad, contratos, RLS/grants, actor, estados, rating, unicidad, inmutabilidad, privacidad, reputación, elegibilidad, paginación, notificación y rollback.
- Jest: rating, comentario, payload, agregado, orden, CTA, read-only, vacío y errores.
- Regresión: nueve suites pgTAP y aplicación móvil completa.

## 2. Casos

| IDs | Cobertura |
|---|---|
| `TEST-260..263` | Entidad congelada, FK/unique/check, RLS y contratos endurecidos. |
| `TEST-264..268` | Anónimo, no confirmado, suspendido, worker y cliente ajeno bloqueados. |
| `TEST-269..272` | `scheduled`, `in_progress`, `completion_pending` rechazados y `completed` aceptado. |
| `TEST-273..275` | Rating inferior/superior rechazado, válido aceptado. |
| `TEST-276..278` | Actor/worker derivados, comentario normalizado y payload estrecho. |
| `TEST-279..282` | Duplicado/concurrencia, exactamente uno e inmutabilidad. |
| `TEST-283..285` | Lectura cliente/worker y tercero bloqueado. |
| `TEST-286..289` | Promedio, conteo, neutral sin reviews y orden/paginación. |
| `TEST-290..293` | Allowlist pública, sin contacto/booking/ubicación y elegibilidad MOD-05. |
| `TEST-294..296` | Notificación, atomicidad y regresión MOD-01..08. |
| `TEST-297..299` | Validación/payload/error/CTA móvil y recorrido Android manual. |

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

El último comando es solo inspección; no aplicar migraciones remotamente.

## 4. Verificación manual diferida

Android/Supabase real debe comprobar dos clientes, worker, doble toque, pérdida de red, actualización del booking, perfil público y accesibilidad del selector. Si no se ejecuta, no se registra como PASS.

## 5. Resultados

| Control | Resultado |
|---|---|
| Reset local | PASS; aplicó MOD-01 a MOD-09. |
| pgTAP | PASS: **9 archivos / 537 aserciones**; MOD-09 **60/60**. |
| Lint PostgreSQL `public,private` | PASS; sin errores. |
| TypeScript | PASS. |
| ESLint | PASS. |
| Jest | PASS: **11 suites / 130 pruebas**, sin snapshots. |
| Expo Doctor | PASS: **21/21**. |
| Dependencias Expo | PASS; alineadas. |
| Export web | PASS. |
| `git diff --check` | PASS. |
| `db push --dry-run` | PASS; aplicaría solo `20261001020000_mod09_reviews.sql`; no se desplegó. |
| Android/Supabase real | No ejecutado; diferido. |
