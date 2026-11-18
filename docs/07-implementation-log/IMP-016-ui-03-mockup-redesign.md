# IMP-016 — UI-03 Rediseño fiel a los mockups

**Estado:** COMPLETE / AUTOMATED VALIDATED; MANUAL DEVICE REVIEW DEFERRED  
**Fecha:** 2026-11-17  
**Rama:** `feature/UI-03-mockup-redesign`

## Trazabilidad

Mockups `screen_ideas/*.png` + paleta oficial → `UI-03` (`docs/08-design/ui-03-mockup-redesign.md`) → presentación de `MOD-01`, `MOD-02`, `MOD-04`..`MOD-13` en `apps/mobile` → sin migraciones → `IMP-016`.

## Implementación

- Tokens `palette`, `ui`, `shadows`, `uiRadii` en `theme.ts`; los tokens UI-01 conservan sus valores.
- Logotipo blanco y azul marino generados a partir de la pieza de texto del kit de marca.
- Dependencia `@expo/vector-icons` (versión alineada con Expo SDK 57) para iconos rellenos; `AppIcon` se mantiene para autenticación.
- Componentes compartidos nuevos: `Icon`, `Kit`, `Avatar`, `StarRating`, `PillButton`, `Wordmark`; reescritos `MarketplaceHeader` y `MarketplaceNav` con API compatible.
- Rediseño de Inicio, Explorar (incluye mapa), Mis solicitudes, Nueva solicitud, Detalle de solicitud, Chat y Mensajes, Mi perfil, Mi trabajo, Perfil profesional y pantallas secundarias.
- Lógica, servicios, validaciones, rutas, estados de error/vacío/carga y paginación sin cambios. Lecturas reutilizadas sin RPC nuevas: categorías y búsqueda en Inicio, contador de notificaciones en cabeceras, reputación pública en “Mi trabajo”.
- Helpers puros nuevos: `public-worker-model` (agrupación de disponibilidad) con pruebas, `chat-dates` (separadores por día).
- Sign In y Sign Up sin cambios.

## Validación

- Mobile: `tsc --noEmit` PASS, `eslint src` PASS, Jest 18 suites / 182 pruebas PASS.
- Revisión en Android real contra Supabase: diferida, no marcada PASS.
