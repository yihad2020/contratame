# IMP-017 — UI-04 rediseño de pantallas autenticadas

**Fecha:** 2026-11-14
**Rama:** `codex/ui-03-ui-04-redesign` (segundo parche, sobre `IMP-016`)
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
- Al integrar los parches con el trabajo local más reciente, `Mi perfil` conserva la edición bajo demanda, el acceso explícito al perfil profesional y la confirmación antes de cerrar sesión. Estas funciones se presentan mediante `MenuList`, sin recuperar la composición visual anterior.
- `AppIcon` conserva los símbolos semánticos de certificación y favorito delineado requeridos por ese menú.

## Alcance

Sin cambios de backend, migraciones, RLS, RPC, Storage, reglas de negocio ni dependencias. No se altera la lógica de datos de ninguna pantalla.

## Validación

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobado, sin errores. |
| `npm run lint` | Aprobado, 0 errores y 0 advertencias. |
| `npm test -- --runInBand` | Aprobado: 18 suites y 187 pruebas. |
| `npx expo export --platform web` | Aprobado; bundle web generado correctamente. |
| `git diff --check` | Aprobado. |

La primera ejecución de Jest dentro del sandbox de Windows se detuvo antes de ejecutar pruebas por un error `EPERM` al renombrar archivos de caché. La misma suite se repitió fuera de ese aislamiento y aprobó íntegramente; no fue necesario cambiar código ni configuración de pruebas.

Revisión visual en Android real (360 × 800, 390 × 844, 412 × 915) pendiente; no se marca como aprobada.
