# UI-01 — Sistema de marca y shell móvil v1

**Identificador:** `UI-01`  
**Plataforma inicial:** Android / Expo / React Native  
**Módulo funcional preservado:** `MOD-01`  
**Requisitos relacionados:** `RF-001..RF-010`, `RNF-001..RNF-007`

## 1. Objetivo

Establecer una base visual reutilizable para Contrátame! y aplicarla al shell móvil, autenticación, estados de cuenta, inicio y perfil sin ampliar el alcance funcional de `MOD-01`.

La interfaz busca sentirse cercana, confiable y profesional. La referencia principal es la composición mínima de la opción 4, con una cantidad moderada de la calidez de la opción 3.

La segunda refinación visual de UI-01 incorpora como referencia de calidad un ejemplo externo “Before → After”. Solo se adoptan sus principios de ritmo compacto, agrupación clara, bordes equilibrados y densidad móvil; no se reutilizan su contenido, navegación ni patrones propios del mercado inmobiliario.

La tercera refinación visual suma fotografía boliviana exclusivamente en autenticación. El tratamiento conserva los formularios y la navegación existentes, y no introduce esperas en splash, hidratación o acceso a Home.

La cuarta refinación convierte las dos pantallas de autenticación en una composición inmersiva: el slideshow cubre el fondo completo, con una capa azul oscuro para legibilidad y superficies blancas translúcidas para la marca y los formularios. La experiencia de registro prioriza el desplazamiento y el teclado por encima del efecto visual.

## 2. Activos de marca

Los activos canónicos se conservan sin modificaciones destructivas:

- `apps/mobile/assets/images/brand/contratame-logo.png`: logotipo horizontal para cabeceras compactas, autenticación y momentos de marca.
- `apps/mobile/assets/images/brand/contratame-bear.png`: mascota independiente para splash y estados introductorios seleccionados.
- `apps/mobile/assets/images/brand/start-screen-reference.png`: referencia visual de dirección, no plantilla literal.
- `apps/mobile/assets/images/bolivia/bolivia-01.png` a `bolivia-05.png`: fotografías locales aprobadas para el fondo rotativo de autenticación; no se modifican ni se descargan en tiempo de ejecución.

Los activos de marca usan dimensiones explícitas, `resizeMode="contain"` y proporciones consistentes. Las fotografías se presentan con `cover` en el fondo completo de Sign In y Sign Up, sin deformación; no se usan en rutas autenticadas.

Evidencia de la implementación responsive web:

- `docs/08-design/screenshots/ui-01-sign-in.png`
- `docs/08-design/screenshots/ui-01-sign-up.png`

Además, ambas pantallas se revisaron con un viewport Android de 390 × 844 px. Las capturas guardadas usan 500 px de ancho por una limitación mínima del navegador headless de Windows.

## 3. Filosofía visual

- Fondo blanco o gris muy claro, con superficies blancas.
- Azul como color de acción e identidad.
- Verde reservado para proveedor, éxito y futura certificación.
- Jerarquía tipográfica fuerte, espacio generoso y tarjetas compactas.
- Bordes sutiles en lugar de sombras decorativas.
- Patrones Android reconocibles, controles de tamaño táctil accesible y navegación corta.
- Contenido real del módulo actual; los módulos futuros muestran una interacción “Próximamente” sin datos ficticios.

## 4. Paleta semántica

| Token | Valor | Uso |
|---|---:|---|
| `primary` | `#0969DA` | Acciones, enlaces e iconos interactivos. |
| `navy` | `#102A43` | Identidad oscura y jerarquía fuerte. |
| `green` | `#20C65A` | Acento de marca para proveedor/éxito. |
| `background` | `#F7F9FC` | Fondo general. |
| `surface` | `#FFFFFF` | Formularios y tarjetas. |
| `authCard` | Blanco al 82 % | Superficie legible del formulario sobre fotografía. |
| `authLogoSurface` | Blanco al 84 % | Separación del logotipo sobre fotografía. |
| `authGlassBorder` | Blanco al 64 % | Contorno sutil de las superficies de autenticación. |
| `text` | `#10233F` | Texto principal. |
| `textSecondary` | `#667085` | Texto de apoyo. |
| `border` | `#E4EAF1` | Divisores y contornos suaves. |
| `danger` | `#B42318` | Errores, bloqueo y acciones destructivas. |

Los estados presionados, fondos suaves y variantes accesibles se definen junto a estos tokens en `src/constants/theme.ts`. Las pantallas no deben duplicar valores de color de marca.

## 5. Tipografía

La versión v1 usa la tipografía del sistema para evitar peso de descarga y mantener familiaridad nativa. La escala incluye display, título, sección, cuerpo, cuerpo enfatizado, etiqueta, texto auxiliar y overline.

Los encabezados usan pesos 700–800; el cuerpo se mantiene en 16 px con interlineado de 24 px. El texto secundario no sustituye al texto principal cuando la información es crítica.

## 6. Espaciado, radios y tamaños

- Escala de espaciado basada en 4 px: 4, 8, 12, 16, 24, 32 y 40.
- Radios: 8, 12, 16 y 20 px; píldora solo para estados compactos.
- Altura de campo: 56 px; altura de botón: 54 px.
- Área táctil mínima: 48 px.
- Margen horizontal de pantalla: 20 px.
- Contenido centrado con ancho máximo de 560 px para conservar una composición móvil útil también en web.

## 7. Convenciones de componentes

- `BrandLogo`: logotipo horizontal con ancho configurable.
- `MascotImage`: mascota independiente, siempre contenida y sin recorte.
- `AppIcon`: única puerta de entrada a Expo Symbols; usa símbolos outline equivalentes en iOS, Android y web.
- `AppButton`: variantes primaria, secundaria, ghost y danger; separa `loading` de `disabled`.
- `FormField`: etiqueta persistente, error en línea, ayuda opcional, estado de solo lectura y visibilidad de contraseña.
- `Screen`: safe areas, teclado, desplazamiento y ancho de lectura consistente; admite un fondo decorativo opcional detrás del contenido sin alterar su uso normal.
- `AppHeader`: variantes reutilizables de marca, navegación centrada y saludo personalizado.
- `FormSection`: agrupa controles relacionados sobre una superficie suave con etiqueta compacta opcional.
- `ChoiceCard`: entrada funcional de alto nivel con icono, título, descripción y affordance de navegación.
- `StatusBadge`: estado compacto con texto, punto y color semántico.
- `SectionHeader`: título de sección con una acción textual opcional.
- `LoadingState`: hidratación de Auth con marca, sin barra ni porcentaje ficticio.
- `BoliviaHeroSlideshow`: fondo fotográfico completo con dos capas locales, cambio cada 7 segundos y crossfade nativo suavizado de 1,8 segundos, sin controles ni gestos.
- `AuthGlassScreen`: composición compartida de Sign In y Sign Up: estado de barra claro, marca sobre una superficie pequeña y formulario en una tarjeta translúcida. La variante de registro mantiene la tarjeta arriba y desplazable.
- `FormSection` permite una variante sin superficie interna para evitar tarjetas anidadas en los formularios de autenticación.

Las rutas siguen siendo responsables de composición y estado local. Supabase, validaciones y reglas de acceso permanecen en sus módulos existentes.

## 8. Uso de la mascota

La mascota es identidad de marca y no relleno decorativo. En UI-01 aparece en:

- splash nativo;
- estado JS de hidratación inicial.

No aparece en formularios, inicio, perfil ni estados de error/bloqueo. Podrá reutilizarse en onboarding o estados vacíos importantes cuando exista contenido funcional que lo justifique.

## 9. Accesibilidad básica

- Objetivos táctiles de al menos 48 px.
- Etiquetas accesibles para iconos y controles sin texto.
- Errores y mensajes de estado anunciables.
- Contraste semántico entre texto, superficie y acciones.
- Campos con etiquetas visibles y tipos de teclado/autocompletado apropiados.
- El estado de carga del botón no se confunde con un botón deshabilitado.
- Safe areas y desplazamiento protegen contenido en pantallas pequeñas y con teclado visible.
- Las fotografías del slideshow son decorativas y se excluyen del árbol de accesibilidad; el logotipo conserva una etiqueta descriptiva.
- La animación se detiene cuando el sistema solicita reducción de movimiento y cuando la ruta pierde foco o desmonta.
- Una capa azul oscuro al 48 % estabiliza la legibilidad del fondo; la tarjeta blanca al 82 % conserva el contraste de títulos, etiquetas, campos y acciones. Los campos mantienen superficie opaca. El scroll y las safe areas continúan activos en ambas rutas.

## 10. Navegación

UI-01 mantiene solo dos destinos funcionales:

- Inicio.
- Mi perfil.

No se agrega barra inferior porque todavía no hay suficientes destinos implementados. Inicio expone el perfil mediante una acción de cabecera; perfil usa navegación de retorno. Búsqueda y perfil profesional son entradas visuales con aviso no destructivo “Próximamente”.

Home usa un encabezado personalizado compacto y reserva las tarjetas principales para las dos decisiones de producto. El estado normal de cuenta y el cierre de sesión no compiten con esas decisiones: el perfil se resume de forma liviana y el cierre de sesión vive en la pantalla de perfil.

## 11. Antipatrones evitados

- Gradientes, blobs y sombras decorativas.
- Tarjetas flotantes sin propósito.
- Estadísticas, profesionales, categorías, calificaciones o contenido de marketplace ficticio.
- Barras o porcentajes de carga simulados.
- Emojis como iconos permanentes o mezcla de familias de iconos.
- Mascota repetida en todas las pantallas.
- Tabs muertos para búsqueda, trabajos, mensajes, reservas o trabajadores.
- Colores de marca hardcodeados de forma dispersa.
- Cambios de Auth, RLS, migraciones o reglas de negocio motivados solo por la presentación.
- Carruseles interactivos, indicadores, flechas, gestos, parallax o dependencias de animación para fotografía decorativa.
