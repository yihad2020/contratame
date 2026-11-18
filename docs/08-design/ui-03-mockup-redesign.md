# UI-03 — Rediseño fiel a los mockups

**Fecha:** 2026-11-17  
**Alcance:** presentación móvil de todas las rutas autenticadas; sin cambios de contrato funcional, base de datos, RLS ni RPC.  
**Excluido:** Sign In y Sign Up (`src/app/(auth)/*`, `src/components/brand/*`) y los componentes que solo comparten con ellas (`AppButton`, `FormField`, `FormSection`, `BrandLogo`, `Typography`, `AppIcon`) se conservan sin cambios.

## Decisión de color

UI-02 tomó los mockups de `screen_ideas/` solo como referencia de densidad. UI-03 reproduce su composición (cabecera oscura con esquinas redondeadas, tarjetas superpuestas, píldoras, avatares con aro, barra inferior de cinco pestañas, títulos de sección con “Ver todas >”) y sustituye sus colores por la paleta oficial de marca:

| Mockup | UI-03 | Token |
|---|---|---|
| Cabecera negra | Azul marino `#0B3C7B` | `ui.header` |
| Acento naranja (botones, estrellas, pestaña activa, enlaces) | Azul claro `#0A71C8` | `ui.accent` |
| Fondos naranja suaves | Azul claro suave | `ui.accentSoft`, `ui.accentTint` |
| Verde (en línea / éxito) | Verde `#12B834` | `ui.green`, `ui.greenSoft` |
| Botón negro “Cerrar sesión” | Azul marino | `PillButton variant="dark"` |

Los tokens `palette`, `ui`, `shadows` y `uiRadii` viven en `src/constants/theme.ts`. Los tokens UI-01 (`colors`, `spacing`, etc.) no cambian de valor para preservar la autenticación.

## Activos

- `assets/images/brand/contratame-wordmark-white.png`: logotipo “Contrátame!” en blanco con el check y el signo de exclamación verdes, recortado de la pieza de texto del kit de marca, para cabeceras oscuras.
- `assets/images/brand/contratame-wordmark-navy.png`: la misma pieza en su color original para superficies claras.

## Componentes nuevos

- `Icon`: iconos rellenos de `@expo/vector-icons` (MaterialCommunityIcons), necesarios porque `expo-symbols` solo ofrece la variante outline en Android/web. Incluye glifos por categoría (`icon_key`/slug).
- `MarketplaceHeader` (reescrito, API compatible): marca, botón de vidrio con indicador, título grande, barra compacta (`barTitle`), contenido interno (`children`), elemento a la derecha (`trailing`) y tarjeta superpuesta (`overlap`).
- `MarketplaceNav` (reescrito): Inicio, Explorar, Solicitudes, Mensajes, Perfil.
- `Kit`: `Card`, `SectionTitle`, `Tag`, `StatusPill`, `IconBubble`, `CategoryTile`, `StepProgress`.
- `Avatar`, `StarRating`, `PillButton`, `Wordmark`.

## Correspondencia mockup → pantalla

| Mockup | Ruta / pantalla |
|---|---|
| `inicio` | `(app)/home` |
| `explorar` | `(app)/explore` (`ExploreScreen`, mapa con `react-native-maps` en nativo y marcador estático en web) |
| `mis_solicitudes` | `(app)/requests` |
| `nueva_solicitud` | `(app)/worker/[workerId]/request` |
| `chat` | `(app)/chat/[conversationId]` |
| `mi_perfil` | `(app)/profile` |
| `perfil` (“Mi trabajo”) | `(app)/worker-onboarding/status` |
| `perfil_profesional` | `(app)/worker/[workerId]` |

Las demás pantallas autenticadas (reservas, notificaciones, favoritos, reportes, certificación, reseñas, onboarding profesional y estados de cuenta) adoptan el mismo lenguaje visual.

## Sin datos ficticios

Los mockups muestran elementos que el modelo de datos no tiene. Se omiten o se reemplazan por equivalentes honestos:

- Fotos de perfil → avatar con iniciales.
- “En línea” → el punto verde solo se usa para el usuario autenticado; los profesionales verificados muestran un check verde.
- Calificaciones en resultados de búsqueda y solicitudes → omitidas (sí se muestran en el perfil público, con datos reales de reputación).
- Ganancias, “Solicitudes recientes”, contadores de “Mi trabajo” → los accesos directos navegan sin cifras inventadas.
- Llamada telefónica, adjuntos, confirmaciones de lectura, “Seguridad”, “Ayuda”, “Mejor valorados”, subida de fotos en solicitudes → no existen como funcionalidad y no se presentan.
- “Completadas” en solicitudes se presenta como “Cerradas” (rechazada, cancelada o expirada), porque el estado de solicitud no tiene “completada”.
- “Publicar solicitud” en Inicio se presenta como “Mis solicitudes”: las solicitudes se envían a un profesional concreto desde su perfil.
- “Enviar mensaje” en el perfil público se presenta como “Mis mensajes”: las conversaciones existen solo por solicitud (MOD-10).

## Comprobación visual pendiente

La revisión en dispositivos Android reales (360 × 800, 390 × 844, 412 × 915) con datos de Supabase sigue siendo manual.
