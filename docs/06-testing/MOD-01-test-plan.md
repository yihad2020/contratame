# Contrátame! — Plan de pruebas de MOD-01

**Módulo:** `MOD-01`  
**Casos:** `TEST-001..TEST-025`  
**Implementación:** `IMP-001`  
**Estado:** Implementado; resultados registrados en `IMP-001`

## 1. Estrategia

- Unitarias Jest: normalización, validación, evaluación de acceso, frescura de confirmación y almacenamiento seguro nativo.
- Base de datos: migración reproducible y suite pgTAP de 18 aserciones ejecutable con `supabase test db`.
- Integración manual en Supabase de desarrollo: Auth, email, trigger, RLS y restauración real.
- Estática: TypeScript, lint, Expo config, secretos y trazabilidad.

No se usan credenciales reales ni secretos de producción. La automatización E2E integral permanece pendiente.

## 2. Casos

| ID | Escenario y resultado esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-001` | Registro válido crea una identidad por correo sin sesión protegida previa a confirmación. | `RF-001`, `RF-003` | Integración manual |
| `TEST-002` | Registro inválido o rechazado no muestra éxito ni concede acceso. | `RF-001`, `RNF-001` | Unit/Jest + manual |
| `TEST-003` | Trigger crea un perfil con UUID compartido, metadata normalizada y estado `active`. | `RF-002`, `RNF-002` | DB/integración |
| `TEST-004` | PK/FK y transacción impiden perfil duplicado, huérfano o alta parcial. | `RF-002`, `RNF-002` | DB |
| `TEST-005` | Login correcto de correo confirmado restaura identidad y perfil. | `RF-004`, `RF-006` | Integración manual |
| `TEST-006` | Credenciales erróneas o correo no confirmado no acceden; una comprobación usa el usuario Auth fresco aunque la sesión local siga obsoleta, y la ruta de verificación se abandona al cambiar de estado. | `RF-003`, `RF-004` | Unit/integración manual |
| `TEST-007` | Logout local retira rutas/operaciones protegidas sin borrar datos. | `RF-005` | Manual |
| `TEST-008` | Sesión válida se restaura al reabrir; en nativo el payload cifrado admite valores mayores al tamaño práctico directo de SecureStore. | `RF-006`, `RNF-003` | Unit/manual |
| `TEST-009` | Sesión ausente, inválida o expirada termina en login. | `RF-006`, `RNF-001` | Unit/manual |
| `TEST-010` | Cuenta confirmada lee solo su perfil y el correo proviene de Auth. | `RF-007`, `RNF-004` | RLS/manual |
| `TEST-011` | Cuenta `active` actualiza nombre, apellido o teléfono y cambia `updated_at`. | `RF-008` | RPC/manual |
| `TEST-012` | `anon` no lee ni actualiza perfiles. | `RF-010`, `RNF-001` | DB |
| `TEST-013` | Usuario A no lee el perfil privado de B. | `RF-007`, `RF-010` | RLS/integración |
| `TEST-014` | Usuario A no modifica el perfil de B; no existe `UPDATE` directo. | `RF-008`, `RF-010` | DB/RLS |
| `TEST-015` | Usuario normal no cambia estado, id, avatar, timestamps, correo ni contraseña por la RPC. | `RF-008`, `RF-010` | DB/RPC |
| `TEST-016` | Cuenta normal actúa como cliente sin tabla o rol `customer`. | `RF-009` | Revisión de esquema |
| `TEST-017` | Registro no crea `worker_profiles`. | `RF-009` | Integración/esquema |
| `TEST-018` | Cliente no inserta, actualiza ni elimina `user_roles`. | `RF-009`, `RF-010`, `RNF-001` | DB/RLS |
| `TEST-019` | Constraint acepta solo `active`, `suspended`, `deactivated`. | `RF-010`, `RNF-002` | DB |
| `TEST-020` | Perfil `suspended` conserva Auth pero queda fuera de lectura/edición y rutas protegidas. | `RF-006`, `RF-010` | Unit/RLS/manual |
| `TEST-021` | Perfil `deactivated` conserva Auth pero queda fuera de lectura/edición y rutas protegidas. | `RF-006`, `RF-010` | Unit/RLS/manual |
| `TEST-022` | Revisión no encuentra secretos, `service_role`, contraseñas o tokens versionados; el adaptador nativo cifra el payload y elimina payload/clave al cerrar sesión. | `RNF-003` | Unit/revisión estática |
| `TEST-023` | Typecheck y lint pasan; lógica queda fuera de UI presentacional cuando corresponde. | `RNF-005` | Comandos locales |
| `TEST-024` | Expo/Supabase son el stack único; Expo config es válida y la migración es reproducible. | `RNF-006` | Revisión/comandos |
| `TEST-025` | Requisitos, módulo, pruebas e `IMP-001` mantienen referencias consistentes. | `RNF-007` | Revisión documental |

## 3. Matriz de validaciones de entrada

| Dato | Válido | Inválido que debe rechazarse |
|---|---|---|
| `first_name` | Unicode recortado, 2–50 caracteres | 0–1 o más de 50 |
| `last_name` | Unicode recortado, 2–80 caracteres | 0–1 o más de 80 |
| `phone` | vacío o `+` con 8–15 dígitos tras normalizar espacios, puntos, guiones y paréntesis | número local sin `+`, letras, longitud fuera del rango |
| `email` | valor recortado con forma de correo; validación definitiva por Supabase | formato inválido |
| `password` | 8 o más caracteres | 0–7 caracteres |
| confirmación | idéntica a la contraseña | distinta |

Las validaciones críticas de nombres y teléfono se repiten en el trigger/RPC; la coincidencia de contraseñas es solo UI porque la confirmación no se persiste.

## 4. Ejecución

```powershell
Set-Location apps/mobile
npm run typecheck
npm run lint
npm run test:ci
npx expo config --type public

Set-Location ../..
npx supabase test db
git diff --check
```

`supabase test db` necesita Docker y una pila local iniciada. Si el ambiente no lo permite, debe figurar como no ejecutado y no como aprobado.

**Evidencia 2026-09-17:** después de `npx supabase db reset --local`, la suite MOD-01 emitió un plan pgTAP válido y aprobó 18/18 aserciones. No se modificó la migración MOD-01.

## 5. Criterio de salida

Todos los controles disponibles deben pasar; cualquier integración que requiera credenciales, entrega real de email, proyecto remoto o Docker debe quedar explícitamente pendiente. Ninguna revisión estática sustituye las pruebas reales de RLS y Auth.
