# Contrátame! — Plan de pruebas de MOD-04

**Módulo:** `MOD-04`  
**Casos:** `TEST-080..TEST-109`  
**Implementación:** `IMP-006`  
**Estado:** Completo y validado; verificación manual Android diferida

## 1. Estrategia

- pgTAP: contrato, permisos, validación, elegibilidad, privacidad, filtros, PostGIS, deduplicación, orden y paginación.
- Jest: normalización de filtros, parámetros RPC, precio/distancia, deduplicación de páginas y mensajes seguros.
- Regresión: reset local y suites completas MOD-01–04; TypeScript, lint, Expo Doctor y export web.
- Supabase vinculado: despliegue versionado, sincronización de historial y lint de esquemas; smoke manual Android diferido, siempre sin `service_role`.

## 2. Casos

| ID | Escenario esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-080` | Worker aprobado, cuenta activa, categoría y servicio activos aparece. | `RF-031` | pgTAP/integración |
| `TEST-081` | Worker `draft` no aparece. | `RF-031` | pgTAP |
| `TEST-082` | Worker `pending_approval` no aparece. | `RF-031` | pgTAP |
| `TEST-083` | Worker `rejected` no aparece. | `RF-031` | pgTAP |
| `TEST-084` | Worker `suspended` no aparece. | `RF-031` | pgTAP |
| `TEST-085` | Cuenta `suspended` o `deactivated` del worker no aparece. | `RF-031` | pgTAP |
| `TEST-086` | Servicio o categoría inactivos no aparecen. | `RF-031`, `RF-037` | pgTAP |
| `TEST-087` | Texto coincide con título, descripción, categoría o bio sin distinguir caso. | `RF-032` | pgTAP/Jest |
| `TEST-088` | Categoría filtra por UUID activo real. | `RF-033`, `RF-037` | pgTAP |
| `TEST-089` | Ciudad y departamento filtran sin distinguir caso. | `RF-033` | pgTAP |
| `TEST-090` | `pricing_type` filtra los cuatro tipos aprobados. | `RF-033` | pgTAP |
| `TEST-091` | Rango de precio excluye `quote` y respeta mínimo/máximo. | `RF-033` | pgTAP/Jest |
| `TEST-092` | Experiencia mínima filtra 0–60. | `RF-033` | pgTAP |
| `TEST-093` | Día de disponibilidad requiere un rango activo coincidente. | `RF-033` | pgTAP |
| `TEST-094` | Permiso denegado conserva búsqueda sin ubicación. | `RF-034`, `RF-041` | Jest/manual |
| `TEST-095` | Proximidad usa PostGIS y radio del worker. | `RF-034`, `RNF-022` | pgTAP |
| `TEST-096` | Distancia segura se retorna sin coordenadas. | `RF-034`, `RNF-021` | pgTAP |
| `TEST-097` | Salida omite ubicación exacta y `public_location`. | `RNF-021`, `RNF-022` | pgTAP |
| `TEST-098` | Salida omite snapshots, notas y datos administrativos/privados. | `RNF-021` | pgTAP |
| `TEST-099` | El grant owner/admin existente de MOD-02 permanece limitado por RLS: un cliente no ve ubicaciones y un worker no ve la ubicación de otro; `anon` carece de acceso. | `RNF-021` | pgTAP |
| `TEST-100` | Anónimo no ejecuta la RPC; cuenta cliente inactiva/no confirmada falla cerrada. | `RNF-021` | pgTAP |
| `TEST-101` | Límite máximo y offset producen páginas acotadas. | `RF-035`, `RNF-023` | pgTAP/Jest |
| `TEST-102` | Páginas consecutivas no duplican workers y mantienen elegibilidad. | `RF-035` | pgTAP/Jest |
| `TEST-103` | Orden predeterminado es determinístico. | `RF-036` | pgTAP |
| `TEST-104` | Orden por distancia exige ubicación y ordena ascendente. | `RF-036` | pgTAP |
| `TEST-105` | Orden por experiencia funciona; precio solo con tipo comparable. | `RF-036` | pgTAP |
| `TEST-106` | Una coincidencia vacía presenta estado vacío y limpiar filtros. | `RF-041` | Jest/manual |
| `TEST-107` | Filtros inválidos fallan con mensaje de usuario, no SQL crudo. | `RF-033`, `RF-041` | pgTAP/Jest |
| `TEST-108` | Home, Explore, Perfil y contrato `workerId` navegan sin tabs futuros. | `RF-039`, `RF-040` | Jest/manual |
| `TEST-109` | MOD-01, MOD-02 y MOD-03 conservan contratos y suites. | `RNF-027` | suite completa |

## 3. Supabase vinculado y verificación manual diferida

La migración MOD-04 fue aplicada al proyecto Supabase de desarrollo vinculado. Los historiales local y remoto están sincronizados hasta `20260928010000_mod04_marketplace_search.sql` y el lint vinculado de `public`/`private` retornó `No schema errors found`.

Las verificaciones automatizadas cubren elegibilidad, privacidad, autorización, filtros, PostGIS, orden y paginación. No se ha confirmado explícitamente un smoke test manual Android; se difiere a la integración móvil continua y a la fase E2E final, incluyendo permiso concedido/denegado y observación de distancia segura en dispositivo. No se registrarán tokens ni coordenadas exactas en esa evidencia.

## 4. Ejecución

```powershell
npx supabase db reset --local
npx supabase test db
npx supabase db lint --local
npx supabase db push --dry-run

Set-Location apps/mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo export --platform web

Set-Location ../..
git diff --check
```

Nunca ejecutar `supabase db push` remoto automáticamente.

## 5. Criterio de salida

La implementación y validación automatizada se consideran completas cuando pasan reset local, pgTAP completo, controles móviles, alineación Expo, lint del esquema vinculado y sincronización de migraciones. La verificación manual de dispositivo puede quedar diferida si se registra explícitamente y no se presenta como aprobada.

## 6. Resultado de validación confirmado

| Área | Resultado confirmado |
|---|---|
| Supabase local | Reset aprobado; aplicó MOD-01, MOD-02, MOD-03 y MOD-04. |
| pgTAP | **4 archivos / 213 aserciones aprobadas**; MOD-04 aprobó **54/54**. |
| Seguridad y privacidad | Solo aparecen workers elegibles; estados/cuentas/servicios inactivos o no aprobados quedan excluidos; no salen coordenadas privadas; lectura cruzada y acceso `anon` quedan bloqueados; se conserva la allowlist segura. |
| Búsqueda | Texto, filtros, PostGIS, distancia segura, orden, deduplicación y paginación aprobados localmente. |
| TypeScript y ESLint | Aprobados. |
| Jest | **6 suites / 61 pruebas aprobadas**. |
| Compatibilidad Jest/Expo | `moduleDirectories` conserva `node_modules` y agrega `<rootDir>/node_modules/expo/node_modules`; `expo-modules-core` permanece transitiva. |
| Expo | Dependencias alineadas; Expo Doctor **21/21**. |
| Export web | Aprobado. |
| Supabase vinculado | Migración `20260928010000_mod04_marketplace_search.sql` aplicada; historiales local/remoto sincronizados; lint `public`/`private`: `No schema errors found`. |
| Diff | `git diff --check` aprobado; advertencias LF/CRLF únicamente informativas. |
| Android manual | No confirmado; diferido a integración móvil continua/E2E final. |

Con estos resultados, `TEST-080..TEST-109` satisfacen el criterio automatizado de salida y MOD-04 queda **completo y validado**, preservando la verificación manual Android como diferida.
