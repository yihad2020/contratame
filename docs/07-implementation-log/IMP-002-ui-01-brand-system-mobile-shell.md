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
