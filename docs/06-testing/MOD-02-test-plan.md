# Contrátame! — Plan de pruebas de MOD-02

**Módulo:** `MOD-02`  
**Casos:** `TEST-026..TEST-053`  
**Implementación:** `IMP-003`  
**Estado:** Completo y validado; resultados registrados en `IMP-003`

## 1. Estrategia

- Unitarias Jest: validaciones, completitud, disponibilidad, precios, portfolio y presentación por estado.
- Base de datos local: 79 aserciones pgTAP sobre tablas/constraints, RLS, grants, triggers, Storage, RPC atómica, aislamiento de dos usuarios y transición rechazado/reenvío mediante `supabase test db`.
- Integración real controlada: Auth confirmado, RLS entre dos usuarios, PostGIS, upload privado, doble envío y persistencia/reanudación.
- Estática/compilación: TypeScript, lint, Expo Doctor, export web, diff y revisión de secretos.

## 2. Casos mínimos

| ID | Escenario y resultado esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-026` | Registro normal no crea `worker_profiles`. | `RF-011` | DB/integración |
| `TEST-027` | Iniciar onboarding crea o reanuda un único worker `draft`. | `RF-011` | DB/RPC |
| `TEST-028` | `UNIQUE(profile_id)` y RPC idempotente impiden duplicados. | `RF-011`, `RNF-010` | DB |
| `TEST-029` | Bio recortada acepta 40–600 Unicode y rechaza límites inválidos. | `RF-012` | Jest/DB |
| `TEST-030` | Experiencia acepta el entero cero. | `RF-012` | Jest/DB |
| `TEST-031` | Experiencia no entera o fuera de 0–60 se rechaza. | `RF-012` | Jest/DB |
| `TEST-032` | Servicio exige categoría activa, título, descripción y tipo válido. | `RF-013` | Jest/DB |
| `TEST-033` | `quote` guarda `price_bob = NULL` y no muestra Bs 0. | `RF-013` | Jest/DB/UI |
| `TEST-034` | `hourly`/`daily`/`fixed` requieren BOB positivo con hasta dos decimales. | `RF-013` | Jest/DB |
| `TEST-035` | Envío requiere al menos un servicio activo válido. | `RF-013`, `RF-019` | DB/RPC |
| `TEST-036` | Radio acepta 1 y 50 km enteros y rechaza fuera de rango/fracciones. | `RF-014` | Jest/DB |
| `TEST-037` | Coordenada exacta no tiene acceso público ni aparece en una consulta pública amplia. | `RF-014`, `RNF-009` | DB/RLS |
| `TEST-038` | Disponibilidad exige `start_time < end_time` en pasos de 30 minutos. | `RF-015` | Jest/DB |
| `TEST-039` | Rangos superpuestos del mismo día se rechazan. | `RF-015` | Jest/DB |
| `TEST-040` | Rangos que cruzan medianoche se rechazan. | `RF-015` | Jest/DB |
| `TEST-041` | Envío requiere al menos un rango activo válido. | `RF-015`, `RF-019` | DB/RPC |
| `TEST-042` | Cero elementos de portafolio no impide envío. | `RF-016`, `RF-018` | Jest/DB |
| `TEST-043` | El elemento 13 y formatos/tamaños no admitidos se rechazan. | `RF-016` | Jest/DB/manual |
| `TEST-044` | Usuario A no muta onboarding ni Storage del usuario B. | `RNF-008`, `RNF-011` | DB/RLS/integración |
| `TEST-045` | Usuario normal no cambia su estado a `approved`. | `RF-021`, `RNF-008` | Grants/DB |
| `TEST-046` | Un perfil incompleto no puede enviarse aunque se omita la validación cliente. | `RF-018`, `RF-019` | DB/RPC |
| `TEST-047` | Perfil válido transiciona `draft → pending_approval` atómicamente. | `RF-019` | DB/RPC |
| `TEST-048` | Dos envíos/doble toque producen una sola solicitud pendiente. | `RF-019`, `RNF-010` | DB/RPC/integración |
| `TEST-049` | Envío crea historial con snapshot completo e inmutable. | `RF-020` | DB/RPC |
| `TEST-050` | Un worker pendiente no modifica ninguna sección ni objeto. | `RF-021`, `RNF-008` | DB/RLS |
| `TEST-051` | Perfil general MOD-01 sigue editable durante revisión profesional. | `RF-021` | Integración/regresión |
| `TEST-052` | Rechazado reabre el mismo worker y reenvío crea otra solicitud. | `RF-020`, `RF-021` | DB/RPC/integración |
| `TEST-053` | Logout y routing Auth de MOD-01 permanecen intactos. | `RNF-013`, `RNF-014` | Jest/manual |

## 3. Checklist de Supabase real (desarrollo, nunca producción)

El SQL transaccional de `supabase/tests/database/mod02_worker_onboarding.test.sql` usa fixtures temporales y `ROLLBACK`; se ejecuta en una base local desechable con `npx supabase test db`, **no** sobre el proyecto remoto. La lista siguiente es el protocolo de integración para el proyecto de desarrollo vinculado; la inspección estática no reemplaza las comprobaciones reales.

| Caso | Operación con token de usuario (sin `service_role` en el cliente) | Resultado esperado |
|---|---|---|
| A | A consulta `worker_profiles`, `worker_services`, `worker_availability`, `worker_portfolio_items` y `worker_approval_requests` de B por ID. | Cero filas; solo propietario o administrador autorizado ve datos privados. |
| B | A intenta insertar, actualizar y borrar servicios de B. | Denegado o cero filas; servicio de B intacto. |
| C | A consulta `worker_locations` de B, incluyendo `private_location`; consultar como `anon` y revisar respuestas de lista. | Cero filas/sin coordenadas exactas ajenas; no existe SELECT público amplio. |
| D | A intenta `UPDATE worker_profiles.approval_status = 'approved'`. | Sin privilegio; estado no cambia. |
| E | A intenta INSERT/UPDATE/DELETE directo sobre `worker_approval_requests`. | Sin privilegio; snapshot e historial intactos. |
| F | A llama envío omitiendo sucesivamente bio/años, servicio activo válido, ubicación BO/radio/punto y disponibilidad válida; probar categoría inactiva, horario solapado y ruta de portfolio ausente por API directa. | Cada envío incompleto falla sin solicitud ni transición de estado. |
| G | A completa datos y envía por RPC; portfolio puede estar vacío. | Una solicitud pendiente, snapshot correcto y estado `pending_approval` atómicos. |
| H | A dispara dos envíos simultáneos y reintenta después de timeout. | Una sola solicitud pendiente; el segundo intento falla/controla estado sin duplicado. |
| I | A intenta editar perfil profesional, servicios, ubicación, horarios, portfolio y objetos Storage mientras está pendiente; editar perfil general MOD-01 aparte. | Onboarding y objetos privados de solo lectura; perfil general conserva su flujo autorizado. |
| J | Administrador prepara rechazo con motivo y revisión, sin editar snapshot; A reabre, edita y reenvía. | Mismo `worker_profiles.id`, dos solicitudes históricas, solo una pendiente, primer snapshot inmutable. |
| K | A intenta listar/descargar, subir, sobrescribir, mover y eliminar objetos del prefijo de B; prueba ruta propia no canónica y MIME/tamaño >10 MB. | Denegado; bucket privado, prefijo propio exacto, formatos y límite aplicados. |

Completar además la trayectoria móvil: cerrar/reabrir sesión entre cada paso y confirmar reanudación, permiso de ubicación denegado con selección manual, fallo de reverse-geocode con mensaje visible, pérdida de red durante guardado/subida, cancelación de galería sin fila huérfana, optimización JPEG/PNG/WebP y limpieza tras fallos/borrado. Probar en Expo Go Android los tamaños objetivo, teclado y mapa. Registrar identidad de proyecto, fecha, resultado y evidencia redactada para cada caso; nunca guardar tokens ni coordenadas exactas en el repositorio.

Prueba de carrera adicional recomendada para regresión: repetir un borrado de objeto Storage mientras el RPC de envío construye el snapshot y verificar que no queda una ruta confirmada sin objeto. No se registra aquí un resultado específico de esa carrera.

## 4. Ejecución

```powershell
Set-Location apps/mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo export --platform web

Set-Location ../..
npx supabase test db
git diff --check
```

No se ejecuta `supabase db push`; cualquier integración remota requiere autorización explícita.

## 5. Criterio de salida

Los controles locales y de aplicación deben pasar; las comprobaciones reales de Supabase/Android se registran separadamente de las aserciones pgTAP, sin atribuir a estas últimas cobertura que no tienen.

**Evidencia 2026-09-17:** `npx supabase db reset --local` reaplicó MOD-01/MOD-02 y `npx supabase test db` aprobó ambas suites pgTAP (18 + 79 = 97 aserciones). La prueba local de aislamiento SQL no reemplaza las operaciones Auth/Storage del checklist A–K en el proyecto de desarrollo.

## 6. Resultado de validación confirmado (actualización 2026-09-20)

El usuario confirmó la finalización de la validación real de MOD-02 en Supabase de desarrollo y en un dispositivo Android físico con Expo Go. No se agregan identificadores de ejecución, capturas ni resultados individuales del checklist A–K que no hayan sido proporcionados.

| Área | Resultado confirmado |
|---|---|
| Supabase local | Reset limpio aplicó `20260910010000_mod01_auth_profiles.sql` y `20260915010000_mod02_worker_onboarding.sql`. pgTAP: MOD-01 18/18 y MOD-02 79/79; total 97/97. |
| Validación de aplicación | TypeScript y lint aprobados; Jest 5 suites/51 pruebas; Expo Doctor 21/21; export web y `git diff --check` aprobados. |
| Supabase vinculado | Historial de migraciones MOD-01/MOD-02 sincronizado; lint del esquema vinculado aprobado. |
| Integración MOD-02 | Validación real en Supabase de desarrollo aprobada, incluidas las comprobaciones pertinentes de propiedad y seguridad. |
| Android físico / Expo Go | Onboarding de trabajador aprobado: inicio/reanudación de borrador, servicios/precios, ubicación/radio, disponibilidad, portafolio/Storage, revisión/envío, transición `draft → pending_approval` y bloqueo de datos profesionales pendientes. |

Con estos resultados confirmados, el estado de implementación de MOD-02 es **completo y validado**. La prueba de carrera Storage descrita arriba no tiene un resultado individual documentado y no se presenta como aprobada.
