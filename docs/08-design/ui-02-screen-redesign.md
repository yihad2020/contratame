# UI-02 — Rediseño de pantallas a partir de mockups

**Fecha:** 2026-09-20  
**Alcance:** presentación móvil de `MOD-01` y `MOD-02`; sin cambios de contrato funcional.

## Referencias y traducción

Se inspeccionaron las ocho imágenes de `screen_ideas/`:

| Mockup | Uso en Contrátame! |
|---|---|
| `inicio` | Inicio actual: cabecera compacta, saludo, acciones y secciones agrupadas. |
| `mi_perfil` | Perfil de cuenta: resumen, datos editables y cierre de sesión separado. |
| `perfil_profesional` | Estado profesional: resumen, servicios, zona pública, disponibilidad y portafolio reales. |
| `explorar` | Referencia futura de búsqueda y filtros; sin ruta ni datos nuevos. |
| `perfil` | Referencia futura de perfil público/área del proveedor; no se inventan estadísticas ni solicitudes. |
| `mis_solicitudes` | Referencia futura para listas y estados de solicitudes. |
| `nueva_solicitud` | Referencia futura para formularios escalonados. |
| `chat` | Referencia futura para conversaciones. |

Los mockups orientan densidad, jerarquía, distribución de iconos, tarjetas y navegación; no se copian sus acentos naranja ni su contenido ficticio. La traducción usa azul primario, verde de proveedor/éxito, blanco, gris claro y azul marino del sistema UI-01. Los nuevos tonos de cabecera y superficie están centralizados en `theme.ts`.

## Patrón de pantalla

- `MarketplaceHeader` ofrece cabecera azul marino con marca, título, contexto y acción opcional. Se usa en Inicio, Perfil, estado profesional, onboarding y estados de cuenta.
- `MarketplaceNav` ofrece solo Inicio y Mi perfil. Su distribución permite añadir destinos cuando existan rutas funcionales; no presenta Explorar, Solicitudes ni Chat como pestañas falsas.
- `Screen` admite cabecera de ancho completo dentro del scroll y pie fijo; mantiene safe areas, teclado y ancho máximo. La barra inferior añade el inset inferior real del dispositivo.
- El estado profesional muestra únicamente datos reales de `WorkerDraft`. La zona exacta permanece privada; solo se representa la etiqueta pública y el radio. En `pending_approval`, `approved` y `suspended` no aparece acción de edición.
- Los seis pasos conservan sus componentes de lógica y usan una cabecera común, progreso segmentado, superficies compactas y controles táctiles existentes.
- Sign In y Sign Up mantienen las fotografías locales de Bolivia, overlay y formularios translúcidos. Los estados de verificación, bloqueo y error usan la misma cabecera de producto y contenido legible.

## Límites funcionales

La búsqueda conserva el aviso “Próximamente”; no se crean trabajadores, solicitudes, reseñas, calificaciones, mensajes, datos de ejemplo ni rutas futuras. Las acciones de inicio/reanudación de perfil profesional, edición de perfil personal, logout, disponibilidad, ubicación, servicios, portafolio y envío conservan sus servicios y validaciones existentes. UI-02 no modifica Auth, Supabase, migraciones, RLS, RPC ni reglas de aprobación.

## Comprobación visual pendiente

La composición utiliza gutters de 20 px, ancho máximo de 560 px, controles táctiles de al menos 48 px y desplazamiento para formularios largos. La revisión final en dispositivos de 360 × 800, 390 × 844 y 412 × 915 px, incluido Android con teclado y estados Auth reales, sigue siendo una comprobación manual; el export web no la sustituye. No se generaron capturas nuevas de sesiones autenticadas.
