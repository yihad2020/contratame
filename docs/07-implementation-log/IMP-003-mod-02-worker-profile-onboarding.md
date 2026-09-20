# IMP-003 — Primera implementación de MOD-02

**Fecha:** 2026-09-15  
**Módulo:** `MOD-02 — Perfil profesional y onboarding del trabajador`  
**Requisitos:** `RF-011..RF-022`, `RNF-008..RNF-014`  
**Pruebas:** `TEST-026..TEST-053`  
**Estado:** Completo y validado

## Cambios implementados

- Migración reproducible de la porción MOD-02 del modelo congelado: PostGIS, `worker_profiles`, `worker_locations`, `service_categories`, `worker_services`, `worker_availability`, `worker_portfolio_items` y `worker_approval_requests`.
- Catálogo inicial limitado a las ocho categorías ejemplificadas por la documentación congelada, administrado en base de datos y no hardcodeado en la UI.
- RPC idempotente `start_or_resume_worker_onboarding()` y RPC atómica `submit_worker_profile_for_approval()`.
- Snapshot privado versionado con perfil, servicios/precios, ubicación/radio, disponibilidad, portafolio y metadata del envío.
- RLS y grants de mínimo privilegio, serialización de ediciones con el worker, validaciones/constraints y protección inmutable del historial.
- Bucket privado `worker-portfolio`, límite 10 MB, MIME JPEG/PNG/WebP y políticas de propiedad/estado; lectura administrativa autorizada preparada para revisión futura.
- Home conectado al estado profesional real y onboarding reanudable en seis pantallas modulares con estado de revisión/aprobación/rechazo/suspensión.
- Ubicación actual opcional, selección manual de mapa nativa, fallback web compilable, etiquetas editables y radio 1–50 km.
- CRUD de servicios, rangos semanales, galería privada con optimización aproximada a 1600 px y revisión explicada antes del envío.
- 26 pruebas unitarias nuevas dentro de una primera ejecución total de 49 y script SQL para `TEST-026..TEST-053`; la validación posterior alcanzó 51 pruebas Jest y 79 aserciones pgTAP de MOD-02.

## Seguridad

- El alta MOD-01 permanece sin referencias a `worker_profiles`; iniciar onboarding es explícito.
- Ningún usuario normal recibe `INSERT`/`DELETE` directo sobre `worker_profiles`, permiso sobre `approval_status` ni mutación de historial.
- Las funciones privilegiadas usan `SECURITY DEFINER`, `search_path = ''`, `auth.uid()`, cuenta confirmada/activa, propiedad y grants mínimos.
- Las mutaciones hijas bloquean el worker y solo admiten `draft`/`rejected`; el envío concurrente se serializa y un índice parcial impide dos solicitudes pendientes.
- `worker_locations` y el bucket carecen de acceso anónimo; las coordenadas exactas no se habilitan mediante ninguna consulta pública.
- `public_location` permanece nulo en MOD-02; no se inventó algoritmo de ofuscación.
- Pendiente conserva lectura propia pero bloquea ediciones de tablas y Storage; `update_my_profile` de MOD-01 no se modifica.

## Conflictos de esquema

No se detectó un conflicto representacional: `worker_approval_requests.profile_snapshot jsonb NOT NULL` permite conservar la instantánea aprobada y el modelo congelado ya exige historial no sobrescrito y envío transaccional. No se modifican los documentos congelados de `docs/03-database/`.

## Dependencias (registro inicial de 2026-09-15)

`npx expo install` resolvió versiones SDK 57 y actualizó `package.json` para:

- `expo-location ~57.0.18`
- `react-native-maps 1.27.2`
- `expo-image-picker ~57.0.18`
- `expo-image-manipulator ~57.0.18`

En esa primera ejecución, `npm install` no pudo descargar paquetes: el TLS local presentaba un certificado de inspección Fortinet cuyo emisor no estaba en el almacén de confianza (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). No se desactivó `strict-ssl` ni se aceptaron paquetes sin verificación. En ese momento, `node_modules` y `package-lock.json` no contenían estos cuatro paquetes; el estado posterior queda registrado abajo.

## Validaciones iniciales (histórico de 2026-09-15)

| Validación | Resultado |
|---|---|
| `npm test -- --runInBand` | Aprobada: 5 suites, 49 pruebas. |
| `git diff --check` | Aprobada; solo avisos informativos LF/CRLF. |
| Revisión de TypeScript sin dependencias nuevas | El código propio queda sin errores; `tsc` reporta exclusivamente los cuatro módulos aún no instalados. |
| `npm run lint` | Falla exclusivamente `import/no-unresolved` para los mismos cuatro módulos. |
| `npx expo export --platform web` | No ejecuta el bundle porque el config plugin `expo-location` no está instalado. |
| `npx --offline expo-doctor` | No completa la inspección por el mismo config plugin ausente. |
| `npx --offline supabase test db` | No ejecutada: conexión rechazada en PostgreSQL local `127.0.0.1:54322`; requiere `supabase start`/Docker. |
| Revisión de secretos | Sin credenciales nuevas; no se agregó `service_role`. |
| Documentos congelados de base de datos | Sin cambios. |

## Validaciones pendientes al 2026-09-15 (histórico)

1. Corregir la cadena de confianza TLS local y ejecutar `npm install` (sin `strict-ssl=false`) para actualizar `package-lock.json`/`node_modules`.
2. Repetir TypeScript, lint, Expo Doctor y export web.
3. Iniciar Supabase local con Docker y ejecutar ambos scripts en `supabase/tests/database/`.
4. Completar el checklist real de `docs/06-testing/MOD-02-test-plan.md`: dos usuarios, RLS, PostGIS, Storage, doble envío y Expo Go Android.

Ninguna migración se aplicó al proyecto Supabase vinculado y no se ejecutó `supabase db push`.

## Revisión funcional y de seguridad — 2026-09-16

- Se revisaron todas las tablas, grants, RLS, triggers, RPC y políticas Storage de la migración MOD-02 contra MOD-01 y el esquema congelado. `start_or_resume_worker_onboarding()` exige cuenta activa/confirmada y conserva `UNIQUE(profile_id)`; el envío exige propiedad, estado editable, completitud, bloqueo del worker y una sola solicitud pendiente, construyendo snapshot y transición en la misma transacción. Las coordenadas exactas/snapshot solo tienen lectura del propietario o administrador activo; ningún SELECT anónimo o de marketplace fue agregado.
- Se corrigió la asociación de cada fila de portfolio a su propio `id` en `storage_path`; antes podía apuntar al objeto de otro ítem del mismo worker. La RPC revalida la ruta; Storage INSERT/UPDATE comprueban el formato de ruta. La ubicación rechaza punto vacío/inválido tanto al guardar como al enviar.
- Las operaciones móviles MOD-02 ahora presentan errores humanos en español sin mostrar mensajes SQL/Supabase, registran código/mensaje solo en desarrollo, no ocultan fallos de carga como ausencia de worker, detienen navegación si falla la recarga y previenen doble toque en inicio, guardados/subida/borrados y envío. El estado posterior a un envío de resultado incierto se consulta antes de permitir reintentar. El límite de 10 MB se comprueba incluso si el picker no proporciona `fileSize` y después de optimizar. La limpieza fallida de Storage se comunica como estado parcial recuperable por soporte.
- La revisión de completitud móvil exige categoría activa y servicio válido, coordenada parseable, rangos válidos/no solapados; el servidor vuelve a validarlo independientemente. Se agregaron 2 pruebas Jest (51 en total) y pruebas SQL transaccionales con usuarios confirmados/no confirmado/suspendido, aislamiento, permisos, envío incompleto/válido, doble envío, bloqueo pendiente y rechazo/reenvío sobre el mismo worker. Estas pruebas SQL aún **no** pudieron ejecutarse: Docker no está iniciado y PostgreSQL local `127.0.0.1:54322` rechaza conexiones. Deben aprobar en base local desechable antes de aplicar la migración.
- La discrepancia anterior de `expo lint` no se reprodujo: con las dependencias instaladas, `npm run lint` y `npx eslint src --no-cache` pasan; `npx expo install --check` confirma versiones compatibles. No se modificó configuración ni se suprimieron errores.
- Validación en esa fecha: `npx tsc --noEmit` aprobado; `npm run lint` aprobado sin avisos; Jest 5 suites/51 pruebas aprobadas; Expo Doctor 21/21; export web aprobado; `npx expo install --check` aprobado. `npx supabase db push --dry-run` aprobó y listó solo `20260915010000_mod02_worker_onboarding.sql`, sin aplicarla. El checklist A–K de integración real estaba pendiente entonces.
- Riesgo residual a probar en proyecto de desarrollo: Storage es una operación externa a la transacción de envío; las políticas comprueban estado/propiedad pero no bloquean la fila del worker durante borrados de objetos. Un borrado concurrente con el envío podría dejar una ruta del snapshot sin objeto. Validar una carrera real antes de despliegue y, si se reproduce, definir un bloqueo transaccional de operaciones Storage sin alterar el esquema congelado. No afirmar completitud de integración hasta entonces.
- Sin commit, push ni `supabase db push`. No se modificaron documentos congelados ni credenciales.

## Reparación pgTAP y validación local — 2026-09-17

- Causa exacta del fallo anterior en la línea ~218: el fixture A ya había ejecutado con éxito `submit_worker_profile_for_approval()`, por lo que `approval_status = 'pending_approval'`. La inserción posterior de disponibilidad debía fallar. `private.assert_owned_editable_worker()` devolvió correctamente SQLSTATE `55000` (`worker onboarding is read-only in the current state`), pero el bloque de prueba solo atrapaba `42501`. Fue un error de expectativa del test, no de autorización de producción.
- Se sustituyeron los bloques `DO` como único mecanismo de verificación por suites pgTAP con planes y resultados reconocibles. MOD-02 tiene 79 aserciones. Los fixtures usan workers separados para aislamiento (B), validaciones de borrador incompleto (E) y envío/rechazo/reenvío (A); la preparación privilegiada del rechazo limpia la identidad cliente y ocurre explícitamente antes de comprobar edición del mismo worker. El bloqueo pendiente se prueba con `throws_ok(..., '55000', ...)`; ningún estado pendiente se hizo editable.
- `npx supabase db reset --local` reaplicó satisfactoriamente `20260910010000_mod01_auth_profiles.sql` y `20260915010000_mod02_worker_onboarding.sql`. `npx supabase test db` aprobó ambos archivos: 18 aserciones MOD-01 + 79 MOD-02 = **97/97**. No se cambió ninguna migración de producción.
- Validación de aplicación: `npx tsc --noEmit`, `npm run lint`, Jest (5 suites/51 pruebas), Expo Doctor (21/21 después de reintentar un fallo transitorio DNS `exp.host`) y export web aprobaron. El checklist real A–K y la carrera de Storage siguen pendientes antes de una migración remota.
- No se ejecutó `supabase db push`, ni commit ni push Git.

## Cierre de validación de MOD-02 — actualización 2026-09-20

El usuario confirmó que las validaciones restantes se completaron. Los apartados anteriores conservan el estado y los bloqueos de sus respectivas fechas; este registro es el estado actual, sin inventar fechas de ejecución, capturas ni resultados individuales no proporcionados.

| Validación | Resultado confirmado |
|---|---|
| Reset local limpio | Aplicó satisfactoriamente MOD-01 (`20260910010000_mod01_auth_profiles.sql`) y MOD-02 (`20260915010000_mod02_worker_onboarding.sql`). |
| pgTAP | **97/97** aserciones: MOD-01 18/18; MOD-02 79/79. |
| Aplicación | TypeScript y lint aprobados; Jest 5 suites/51 pruebas; Expo Doctor 21/21; export web y `git diff --check` aprobados. |
| Supabase vinculado | Historial de migraciones MOD-01/MOD-02 sincronizado; lint del esquema vinculado aprobado. |
| Supabase de desarrollo | Validación real de integración MOD-02 aprobada, incluidas las comprobaciones pertinentes de propiedad y seguridad. |
| Android físico con Expo Go | Onboarding de trabajador aprobado: inicio/reanudación de `draft`, servicios/precios, ubicación/radio, disponibilidad, portafolio/Storage, revisión/envío, transición `draft → pending_approval` y bloqueo de datos profesionales durante `pending_approval`. |

**Resultado:** MOD-02 completo y validado dentro del alcance aprobado `RF-011..RF-022` y `RNF-008..RNF-014`. La carrera específica de borrado Storage concurrente con el envío sigue como prueba de regresión recomendada sin resultado individual documentado; no se la presenta como aprobada. Este cambio actualiza únicamente documentación; no modifica aplicación, migraciones, RLS, RPC, Storage ni reglas de negocio.
