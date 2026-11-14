# UI-04 — Rediseño de todas las pantallas autenticadas

**Fecha:** 2026-11-14
**Base:** continúa `UI-03` (Inicio). Excluye Sign In / Sign Up, que se conservan.

## Enfoque

El rediseño se aplica sobre todo desde los componentes compartidos, para que cada pantalla herede la misma jerarquía sin duplicar estilos.

### Componentes compartidos

- `MarketplaceHeader`: cabecera navy con wordmark tipográfico "Contrátame!" (la "!" en verde) en las pantallas raíz, botón Volver/acción en contenedor translúcido, overline verde, título editorial (34 px en raíz, 28 px en detalle) y `children` opcional (búsqueda de Explorar).
- `MarketplaceNav`: barra inferior flotante en forma de cápsula; la pestaña activa se rellena en navy. Pulsación con resorte.
- `SegmentedControl` (nuevo): selector con indicador animado por resorte, tono claro u oscuro. Lo usan Inicio (Contratar/Trabajar) y Solicitudes (Como cliente/Como profesional).
- `MenuList` (nuevo): filas agrupadas estilo ajustes de Android. Lo usan Mi perfil y Solicitudes.
- `MarketplaceResultCard`: tarjeta única de profesional (identidad, insignia Verificado, fila de datos Experiencia · Radio · Precio, servicio). Compartida por Inicio y Explorar.
- `AppButton`: pulsación con resorte (driver nativo). `FormField`: estado de foco. `ChoiceCard`, `FormSection`, `StatusBadge`, mensajes de feedback y títulos de sección afinados.
- `Screen`: el pie usa el color de fondo para que la barra flotante se integre.
- Radio de tarjetas unificado en `radii.xxl` (24 px).

### Pantallas con cambios de estructura

- **Explorar:** búsqueda dentro de la cabecera (campo + filtros + buscar); fila horizontal de chips con "Cerca de mí" y categorías con icono; estado vacío con icono.
- **Perfil público:** tarjeta principal con identidad, fila de datos (Experiencia · Radio · Reseñas), biografía y "Solicitar servicio" visible sin desplazarse. Favorito y Reportar al final.
- **Solicitudes:** selector segmentado, acceso a "Mis trabajos contratados" como fila, tarjetas con bloque de metadatos.
- **Chat:** bandeja tipo mensajería (filas agrupadas, iniciales, punto verde si está activa, hora a la derecha). Conversación: burbujas más suaves y compositor sobre el fondo.
- **Mi perfil:** tarjeta de identidad, menús agrupados (Profesional, Actividad), formulario de datos personales y Cerrar sesión como fila destacada.
- **Onboarding profesional:** indicador de progreso compacto ("Paso N de 6" + segmentos).

## Restricciones respetadas

Sin degradados ni sombras decorativas, mascota fuera de pantallas cotidianas, paleta azul/verde contenida, objetivos táctiles ≥ 44–48 px, sin nuevas dependencias, sin cambios de backend ni de reglas de negocio.

## Pendiente

- Revisión visual en Android real.
- Tipografía personalizada (requiere dependencia de fuentes).
