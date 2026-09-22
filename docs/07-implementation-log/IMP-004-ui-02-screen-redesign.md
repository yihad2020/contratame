# IMP-004 — UI-02 rediseño de pantallas

**Fecha:** 2026-09-20  
**Identificador:** `UI-02`  
**Módulos preservados:** `MOD-01`, `MOD-02`  
**Requisitos relacionados:** `RF-001..RF-010`, `RNF-001..RNF-007` y los requisitos de onboarding trazados en `IMP-003`.

## Implementación

- Se inspeccionaron los ocho mockups de `screen_ideas/` y se documentó su mapeo en `docs/08-design/ui-02-screen-redesign.md`.
- Se rediseñaron Inicio, Perfil, seis pasos de onboarding, estado profesional, Sign In, Sign Up, verificación, bloqueo y error de cuenta.
- `MarketplaceHeader` y `MarketplaceNav` reúnen las pautas repetidas de cabecera y navegación. `Screen` integra cabecera de ancho completo y pie seguro para dispositivos con barra del sistema.
- El estado profesional usa solo datos ya cargados del borrador: biografía, servicios, precios, zona pública, radio, horarios y trabajos. No expone coordenadas privadas.
- Los formularios de Auth conservan el slideshow boliviano; el registro sigue siendo desplazable y compatible con teclado.
- La navegación inferior se limita a Inicio y Mi perfil; las cinco pantallas futuras no se presentan como funciones terminadas.

## Alcance y trazabilidad

Se mantienen `getWorkerCardCopy`, `startOrResumeWorkerOnboarding`, `updateOwnProfile`, `signOut`, validaciones de formularios y servicio MOD-02, transiciones de aprobación y protección de rutas. No se editaron backend, migraciones, Supabase, RLS, RPC, Storage ni reglas de negocio. UI-02 solo compone y presenta datos existentes.

## Validación

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprobado. |
| `npm run lint` | Aprobado, sin errores ni advertencias tras corregir un import no usado. |
| `npm test -- --runInBand` | Aprobado: 5 suites, 51 pruebas. |
| `npx expo export --platform web` | Aprobado; las fotografías bolivianas locales se incluyen en el export. |
| `npx expo-doctor` | 20/21. Una comprobación falla por seis versiones de parche de Expo ya presentes antes de UI-02 (`expo`, `expo-constants`, `expo-image-manipulator`, `expo-image-picker`, `expo-location`, `expo-router`). No se actualizaron dependencias en una tarea visual. |
| `git diff --check` | Aprobado; pueden aparecer advertencias informativas de conversión LF/CRLF en Windows. |

La comprobación manual en Android y las capturas de sesiones autenticadas quedan fuera de esta ejecución. El export web y las pruebas estáticas no sustituyen esa revisión visual ni validan por sí solos los tamaños 360 × 800, 390 × 844 y 412 × 915 px en dispositivo.
