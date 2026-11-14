# IMP-017 — UI-04 rediseño de pantallas autenticadas

**Fecha:** 2026-11-14
**Rama:** `feature/UI-03-home-redesign` (segundo commit, sobre `IMP-016`)
**Identificador:** `UI-04`

## Trazabilidad

`UI-04` → `docs/08-design/ui-04-app-wide-redesign.md` → componentes de `components/ui/` y pantallas de `modules/*/screens` → `IMP-017`.

## Implementación

- Nuevos: `components/ui/SegmentedControl.tsx`, `components/ui/MenuList.tsx`, `modules/marketplace/category-icons.ts`.
- `FeaturedWorkerCard` (UI-03) pasa a ser `MarketplaceResultCard`, compartida por Inicio y Explorar.
- Rediseñados: `MarketplaceHeader`, `MarketplaceNav`, `AppButton`, `FormField`, `ChoiceCard`, `FormSection`, `SectionHeader`, `StatusBadge`, `Typography`, `Screen` (pie).
- Reestructuradas: Explorar, Perfil público, Solicitudes, Chat (lista y conversación), Mi perfil, onboarding (progreso).
- Resto de pantallas: heredan los componentes compartidos y el radio unificado.
- Sign In / Sign Up no se modifican; solo heredan la pulsación de `AppButton` y el foco de `FormField`.

## Alcance

Sin cambios de backend, migraciones, RLS, RPC, Storage, reglas de negocio ni dependencias. No se altera la lógica de datos de ninguna pantalla.

## Validación

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobado. |
| `npx expo lint` | Aprobado, 0 errores y 0 advertencias. |
| `npx jest --runInBand` | Aprobado: 18 suites, 187 pruebas. |
| `npx expo export --platform web` | Aprobado. |
| `git diff --check` | Aprobado. |

Revisión visual en Android real (360 × 800, 390 × 844, 412 × 915) pendiente; no se marca como aprobada.
