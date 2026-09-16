# IMP-002 — UI-01 sistema de marca y shell móvil

**Fecha:** 2026-09-14  
**Identificador:** `UI-01`  
**Módulo preservado:** `MOD-01 — Autenticación y perfiles de usuario`  
**Requisitos relacionados:** `RF-001..RF-010`, `RNF-001..RNF-007`  
**Estado:** Implementado; validación estática aprobada

## Cambios

- Sistema visual semántico para color, tipografía, espacio, radios y tamaños táctiles.
- Primitivas reutilizables de marca, iconografía, botones, campos, pantalla, cabecera, tarjetas de elección, estados, secciones y carga.
- Splash nativo y carga de hidratación alineados con los activos canónicos.
- Rediseño de inicio de sesión, registro, verificación, bloqueo, error de cuenta, inicio y perfil.
- Home real como base visual del producto, sin tablas, consultas o contenido ficticio de marketplace.
- Navegación mínima entre inicio y perfil; módulos futuros responden con “Próximamente”.
- Expo Symbols declarado como dependencia directa para una familia de iconos consistente.

## Segunda refinación visual

- Home adopta un encabezado personalizado compacto, tarjetas de acción más cortas y un resumen de perfil sin badge de estado ni cierre de sesión.
- Inicio de sesión agrupa formulario y CTA en una superficie suave, reduce el espacio superior y conserva identidad legible en el CTA deshabilitado.
- Registro separa “Datos personales” y “Cuenta” en dos grupos simples, con CTA alcanzable mediante scroll.
- Perfil presenta el correo como metadata de solo lectura, separa los campos editables y traslada el cierre de sesión a una sección secundaria.
- `AppHeader` ofrece variantes de marca, navegación y saludo personalizado; `FormSection` estandariza superficies de formulario.
- Los gutters se ajustan a 20 px, los campos a 56 px y los botones a 54 px.

## Trazabilidad y alcance

UI-01 cambia presentación y composición. Conserva `AuthProvider`, almacenamiento seguro, validación de registro, verificación fresca de correo, evaluación de `account_status`, lectura del perfil y RPC `update_my_profile`.

No modifica migraciones, esquema, RLS, Supabase Auth, documentación congelada de base de datos ni reglas de negocio.

## Tercera refinación visual

- Autenticación incorpora `BoliviaHeroSlideshow`, una cabecera reutilizable construida con `Animated` y cinco fotografías bolivianas locales aprobadas.
- Inicio de sesión usa una versión hero de aproximadamente 31 % de la altura de un teléfono normal; registro usa una versión compacta para priorizar el formulario y el teclado.
- Dos capas de imagen realizan un crossfade de 700 ms cada 4,6 segundos. Solo la capa visible y la siguiente permanecen montadas, evitando cambios en blanco sin renderizar cinco imágenes simultáneamente.
- El temporizador y la animación se detienen al perder foco, desmontar o activar reducción de movimiento. Las fotografías decorativas no se exponen a tecnologías de asistencia.
- Splash nativo, hidratación de Auth, redirecciones, Supabase y reglas de `MOD-02` permanecen sin cambios.

## Validaciones

| Validación | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobada. |
| `npm run lint` | Aprobada. |
| `npm test -- --runInBand` | Aprobada: 4 suites, 23 pruebas. |
| `npx expo-doctor` | Aprobada: 21/21 controles. |
| `npx expo export --platform web` | Aprobada: bundle y activos generados. |
| `git diff --check` | Aprobada; solo advertencias informativas de conversión LF/CRLF. |
| Vista responsive | Inicio de sesión y registro revisados a 360 × 800, 390 × 844 y 412 × 915 px; Home y Perfil revisados mediante rutas temporales no incluidas en el resultado final. Capturas guardadas en `docs/08-design/screenshots/`. |

La inspección estática confirma que las rutas conservan el acceso a Home solo para `active`, bloquean estados no activos, mantienen la verificación fresca, llaman a `update_my_profile` al editar y conservan `signOut`. El shell raíz no monta rutas mientras Auth está en `loading`, evitando el destello de contenido protegido.

## Limitaciones de validación visual

Home, perfil, verificación y estados de cuenta se revisaron por composición y tokens, pero no se capturaron con datos reales porque requieren estados Auth/Supabase de desarrollo. No se introdujeron credenciales, fixtures de sesión ni rutas de demostración para fabricar esos estados.

### Validación de la tercera refinación — 2026-09-15

| Validación | Resultado |
|---|---|
| ESLint enfocado en slideshow, Sign In y Sign Up | Aprobada, sin errores ni advertencias. |
| `npm test -- --runInBand` | Aprobada: 5 suites, 49 pruebas. |
| `git diff --check` | Aprobada; solo advertencias informativas de conversión LF/CRLF. |
| `npx tsc --noEmit` | Bloqueada fuera de UI-01 por cuatro dependencias declaradas pero aún no instaladas de `MOD-02`: `react-native-maps`, `expo-location`, `expo-image-manipulator` y `expo-image-picker`. |
| `npm run lint` | Mismo bloqueo de resolución de las cuatro dependencias de `MOD-02`; los tres archivos de esta refinación pasan ESLint enfocado. |

La instalación y la validación visual en Expo Go no se fuerzan ni se eluden mientras persista el bloqueo TLS/Fortinet ya identificado. La refinación no agrega dependencias.

## Cuarta refinación visual — 2026-09-16

- Sign In y Sign Up usan el mismo fondo fotográfico de pantalla completa con overlay azul oscuro al 48 %. La marca queda sobre una superficie blanca translúcida pequeña; el contenido se presenta en una tarjeta blanca al 90 %, con borde claro y sombra contenida.
- `BoliviaHeroSlideshow` conserva sus cinco imágenes locales, dos capas, crossfade y limpieza de temporizador, pero deja de imponer altura de cabecera o dibujar el logo. `AuthGlassScreen` compone el fondo y las superficies sobre el `Screen` existente.
- La variante larga de registro comienza arriba y conserva el scroll, las safe areas y el comportamiento de teclado de `Screen`. `FormSection` evita superficies opacas anidadas en estas dos rutas; los campos y acciones conservan sus estilos y comportamiento.
- Auth, validaciones, navegación, splash, Supabase, `MOD-02`, migraciones y backend no se modifican.

| Validación | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobada. |
| `npm test -- --runInBand` | Aprobada: 5 suites, 49 pruebas. |
| `npm run lint` | Aprobada. |
| `npx expo-doctor` | Aprobada: 21/21 controles. Se ejecutó con permiso de red tras un fallo de acceso del sandbox al registro npm. |
| `npx expo export --platform web` | Aprobada; bundle y fotografías locales exportados. |
| `git diff --check` | Aprobada; solo advertencias informativas de conversión LF/CRLF. |

No se hizo una captura visual nueva de dispositivo Android; el export web y las validaciones estáticas no sustituyen esa comprobación manual.
