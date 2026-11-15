# IMP-016 — UI-03 rediseño de Inicio

**Fecha:** 2026-11-14
**Rama:** `codex/ui-03-ui-04-redesign`
**Identificador:** `UI-03`
**Módulos preservados:** `MOD-02`, `MOD-04`, `MOD-11`, `MOD-13`

## Trazabilidad

`UI-03` → `docs/08-design/ui-03-home-redesign.md` → `home.tsx`, `modules/home/*`, `ExploreScreen` (parámetros de ruta) → `modules/home/__tests__/home-model.test.ts` → `IMP-016`.

## Implementación

- Se añadió la mascota oficial en la cabecera de Inicio como identificador compacto del acceso al perfil, sin duplicarla en otras secciones de la pantalla.

- Nuevo módulo de presentación `modules/home/` con `home-model.ts` (lógica pura) y componentes `HomeHero`, `ModeSwitch`, `HomeSearchBar`, `CategoryGrid`, `FeaturedWorkerCard`, `WorkerStatusPanel` y `WorkModeContent`.
- Nuevo componente compartido `components/ui/PressableScale.tsx`.
- `AppIcon` incorpora iconos de categorías (`bolt`, `water`, `carpentry`, `construction`, `cleaning`, `garden`, `paint`, `mechanic`), `category` y `arrowRight`.
- `ExploreScreen` acepta `q` y `categoryId` como parámetros iniciales validados.
- Corrección: el reintento del estado profesional vuelve a consultar `getOwnWorkerProfile` en lugar de crear o reanudar el onboarding.

## Alcance

No se modificaron backend, migraciones, RLS, RPC, Storage ni reglas de negocio. Se reutilizan `getOwnWorkerProfile`, `startOrResumeWorkerOnboarding`, `getWorkerCardCopy`, `loadMarketplaceCategories`, `searchMarketplace` y `getMyNotificationUnreadCount`.

## Validación

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobado, sin errores. |
| `npm run lint` | Aprobado, 0 errores y 0 advertencias. |
| `npm test -- --runInBand` | Aprobado: 18 suites y 187 pruebas (incluye `home-model.test.ts`). |
| `npx expo export --platform web` | Aprobado; bundle web generado correctamente. |
| `git diff --check` | Aprobado. |

No se ejecutó `npm ci` porque `package-lock.json` ya estaba desincronizado antes de UI-03 (faltan `@emnapi/core`, `@emnapi/runtime`, `react-native-worklets`). La validación utilizó las dependencias locales existentes y no incluyó cambios de dependencias ni del lockfile.

La revisión visual en Android real (360 × 800, 390 × 844, 412 × 915) y la integración contra Supabase vinculado quedan pendientes y no se marcan como aprobadas.
