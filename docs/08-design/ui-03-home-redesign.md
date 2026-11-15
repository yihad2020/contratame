# UI-03 — Rediseño de Inicio

**Fecha:** 2026-11-14
**Pantalla:** `apps/mobile/src/app/(app)/home.tsx`
**Módulos que consume (sin cambios de reglas):** `MOD-02` (estado profesional), `MOD-04` (categorías y búsqueda), `MOD-11` (contador de notificaciones), `MOD-13` (insignia "Verificado").

## Problemas de la versión UI-02

- La cabecera solo saludaba; la acción principal ("Necesito un servicio") era una tarjeta más entre otras.
- El error de carga del perfil profesional se mostraba dos veces (tarjeta + banner) y ocupaba el lugar más visible incluso para clientes que solo quieren contratar.
- La tarjeta "Reintentar perfil profesional" ejecutaba `startOrResumeWorkerOnboarding` en lugar de volver a consultar el estado.
- "Tu perfil" duplicaba la pestaña Mi perfil.
- Todas las secciones usaban la misma tarjeta blanca con borde; no existía jerarquía.

## Decisiones

- **Dos modos en la cabecera: Contratar / Trabajar.** Estado local de la pantalla (no se persiste ni cambia roles). Contratar muestra búsqueda; Trabajar muestra el estado profesional. Cada usuario ve solo la información de su intención actual.
- **Búsqueda primero.** Campo real en la cabecera; al enviar abre Explorar con `q`. Las categorías abren Explorar con `categoryId`. Explorar valida ambos parámetros (`marketplaceDraftFromRouteParams`) antes de usarlos.
- **Categorías desde la base de datos** (`loadMarketplaceCategories`), icono según `icon_key`, cuadrícula de 4 columnas.
- **Profesionales aprobados:** vista previa de los dos primeros resultados de `searchMarketplace` con filtros por defecto. Solo datos públicos del RPC; sin ubicación exacta.
- **Estado profesional en un solo panel** con una acción: `Reintentar` vuelve a consultar; las demás acciones mantienen `startOrResumeWorkerOnboarding`.
- **Pasos documentados** (perfil gratis → revisión administrativa gratuita → visible) cuando el profesional aún no está aprobado; accesos a Solicitudes y Certificación cuando está aprobado.
- **Interacción:** `PressableScale` aplica un resorte de escala con el driver nativo (sin re-render). El selector de modo desliza su indicador con resorte.
- **Identidad de marca contenida:** la mascota oficial aparece una sola vez en la cabecera, dentro del acceso al perfil y junto al saludo. No se repite en el contenido ni compite con la búsqueda.
- **Restricciones de AGENTS.md respetadas:** sin degradados, sin sombras, paleta azul/verde contenida, objetivos táctiles ≥ 44–48 px, espaciado en la escala 4/8 de `theme.ts`.

## Tokens añadidos en `theme.ts`

`colors.onDarkSurface`, `colors.onDarkBorder`, `colors.warningOnDark`, `colors.successOnDark`, `radii.xxl`, `radii.hero`, `typography.hero`, `typography.sectionTight` y `motion`.

## Fuera de alcance

- Navegación inferior flotante (afecta a todas las pantallas; se evaluará en el siguiente paso de UI).
- Tipografía personalizada (requiere una dependencia de fuentes nueva).
- Rediseño de Explorar, Solicitudes, Chat y Mi perfil.
