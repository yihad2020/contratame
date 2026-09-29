# Contrátame! — Plan de pruebas de MOD-05

**Módulo:** `MOD-05`  
**Casos:** `TEST-110..TEST-139`  
**Implementación:** `IMP-007`  
**Estado:** Validación automatizada completa; verificación Android real diferida

## 1. Estrategia

- pgTAP: contrato RPC/guard, permisos, elegibilidad directa, allowlist, privacidad, arreglos ordenados y política Storage.
- Jest: UUID de ruta, normalización, radio y asociación/fallo de URLs firmadas.
- Aplicación: TypeScript, ESLint, Expo Doctor, alineación de dependencias y export web.
- Regresión: reset local y suites completas MOD-01–05.
- Supabase vinculado: únicamente `db push --dry-run`; MOD-05 no se aplica remotamente en esta tarea.

## 2. Casos

| ID | Escenario esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-110` | RPC, firma, `SECURITY DEFINER`, `search_path` y grants coinciden con el contrato. | `RF-042`, `RNF-028` | pgTAP |
| `TEST-111` | Cliente confirmado/active obtiene una fila para worker elegible. | `RF-042` | pgTAP/integración |
| `TEST-112` | Worker `draft` no está disponible por lookup directo. | `RF-042` | pgTAP |
| `TEST-113` | Worker `pending_approval` no está disponible. | `RF-042` | pgTAP |
| `TEST-114` | Worker `rejected` no está disponible. | `RF-042` | pgTAP |
| `TEST-115` | Worker `suspended` no está disponible. | `RF-042` | pgTAP |
| `TEST-116` | Cuenta general suspendida/deactivated del worker lo excluye. | `RF-042` | pgTAP |
| `TEST-117` | Sin servicio activo en categoría activa no existe perfil público. | `RF-042`, `RF-044` | pgTAP |
| `TEST-118` | `anon` carece de `EXECUTE` y acceso Storage público. | `RNF-028`, `RNF-029` | pgTAP |
| `TEST-119` | Cuenta no confirmada falla cerrada. | `RNF-028` | pgTAP |
| `TEST-120` | Cuenta solicitante suspendida/deactivated falla cerrada. | `RNF-028` | pgTAP |
| `TEST-121` | Nombre minimizado, bio y experiencia coinciden con datos reales. | `RF-043` | pgTAP/Jest |
| `TEST-122` | Zona/radio aparecen sin coordenadas ni geometrías. | `RF-043`, `RNF-028` | pgTAP |
| `TEST-123` | Solo servicios activos de categorías activas aparecen y mantienen precios/tipos. | `RF-044` | pgTAP |
| `TEST-124` | Solo disponibilidad activa aparece en orden semanal. | `RF-045` | pgTAP |
| `TEST-125` | Metadata/ruta de portafolio aparece por `sort_order`, sin URL persistida. | `RF-046` | pgTAP |
| `TEST-126` | Salida omite perfil/Auth/contacto. | `RF-043`, `RNF-028` | pgTAP |
| `TEST-127` | Salida omite estados, snapshots y notas de aprobación/administración. | `RNF-028` | pgTAP |
| `TEST-128` | Salida no anticipa certificación, rating ni reviews. | `RNF-028` | pgTAP |
| `TEST-129` | Cliente no obtiene SELECT directo sobre ubicación, worker u otras tablas privadas. | `RNF-028` | pgTAP |
| `TEST-130` | Bucket `worker-portfolio` permanece privado. | `RF-046`, `RNF-029` | pgTAP |
| `TEST-131` | Cliente puede firmar solo objetos registrados del worker elegible. | `RF-046`, `RNF-029` | pgTAP/integración |
| `TEST-132` | Cuando el worker deja de ser elegible, la lectura de portafolio se cierra. | `RF-046`, `RNF-029` | pgTAP |
| `TEST-133` | Objeto no registrado bajo un prefijo válido permanece privado. | `RNF-029` | pgTAP |
| `TEST-134` | Lectura owner/admin existente se conserva y no se agrega escritura pública. | `RF-046`, `RNF-029` | pgTAP/regresión |
| `TEST-135` | Ruta UUID válida carga perfil y permite volver a Explorar. | `RF-047` | Jest/manual |
| `TEST-136` | Ruta inválida/múltiple/ausente no llama backend y muestra no disponible. | `RF-048` | Jest/manual |
| `TEST-137` | Estados loading, unavailable y error/retry son funcionales y accesibles. | `RF-047` | revisión/manual |
| `TEST-138` | Fallo total/parcial de firma conserva metadata y fallback visual. | `RF-046`, `RNF-030` | Jest/manual |
| `TEST-139` | Una RPC + firma batch evitan N+1 y MOD-01–04 conservan sus suites. | `RNF-030`, `RNF-032` | revisión/suite completa |

## 3. Ejecución

```powershell
npx --yes supabase@2.118.0 db reset --local
npx --yes supabase@2.118.0 test db

Set-Location apps/mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo install --check
npx expo export --platform web

Set-Location ../..
npx --yes supabase@2.118.0 db push --dry-run
git diff --check
```

`db push --dry-run` es inspección únicamente. No ejecutar `db push` ni aplicar MOD-05 al proyecto vinculado en esta tarea.

## 4. Verificación manual diferida

La validación automatizada no sustituye una comprobación Android real de scroll, imágenes firmadas, pérdida de red, expiración de URL, regreso a Explorar y tamaños táctiles. Si no se confirma expresamente, queda diferida a integración móvil continua/E2E y no se registra como PASS.

## 5. Criterio de salida

Reset, pgTAP, controles móviles, export y diff deben aprobar. El dry-run debe listar solo la migración MOD-05 sin aplicarla. Cualquier validación no ejecutable se registra como bloqueo; no se infiere de una revisión estática.

## 6. Resultado de validación

| Área | Resultado |
|---|---|
| Supabase local | Reset aprobado; aplicó MOD-01, MOD-02, MOD-03, MOD-04 y MOD-05. |
| pgTAP | **5 archivos / 263 aserciones aprobadas**; MOD-05 aprobó **50/50**. |
| Esquema local | Lint de `public` y `private`: `No schema errors found`. |
| TypeScript y ESLint | Aprobados. |
| Jest | **7 suites / 66 pruebas aprobadas**. |
| Expo | Dependencias alineadas; Expo Doctor **21/21**. |
| Export web | Aprobado. |
| Dry-run vinculado | Listó solo `20260929010000_mod05_public_worker_profile.sql`; no se aplicó remotamente. |
| Diff | `git diff --check` aprobado; avisos LF/CRLF únicamente informativos. |
| Android real | No ejecutado; diferido a integración móvil continua/E2E. |
