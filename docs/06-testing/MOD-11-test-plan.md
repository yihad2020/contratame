# Plan de pruebas — MOD-11 Notificaciones

**Requisitos:** `RF-097..RF-106`, `RNF-063..RNF-069`  
**Implementación:** `IMP-013`  
**Estado:** COMPLETE / validación automatizada aprobada; `TEST-399` diferido

## 1. Estrategia

- **pgTAP:** entidad congelada, RPCs, grants, RLS, eventos, privacidad, paginación, lectura y Realtime.
- **Jest:** normalización, iconos, formato temporal, cursores, deduplicación, errores, rutas y lifecycle de suscripción.
- **Regresión:** reset desde MOD-01 y ejecución de todos los archivos pgTAP/Jest existentes.
- **Tooling:** TypeScript, ESLint, Expo Doctor, alineación SDK 57, export web, lint SQL y diff.
- **Manual diferido:** Android físico para interacción/foreground/background; push requiere decisión y credenciales externas.

## 2. Casos

| ID | Verificación | Requisito |
|---|---|---|
| TEST-350 | Tabla conserva exactamente las nueve columnas congeladas. | RF-097 |
| TEST-351 | FK de destinatario, tipos y defaults se preservan. | RF-097 |
| TEST-352 | Índices soportan orden y no leídas. | RNF-066 |
| TEST-353 | RLS y policy owner-only están activas. | RNF-063 |
| TEST-354 | Los cuatro RPC existen, son `SECURITY DEFINER` y fijan search path vacío. | RNF-063 |
| TEST-355 | `authenticated` tiene EXECUTE mínimo y `anon` no. | RNF-063 |
| TEST-356 | Realtime tiene SELECT RLS y publication configurados. | RF-102 |
| TEST-357 | No hay DML directo ni parámetros de recipient/content/read timestamp. | RF-105 |
| TEST-358 | Anónimo no lista notificaciones. | RF-097 |
| TEST-359 | Anónimo no cuenta ni marca leídas. | RF-100 |
| TEST-360 | Cuenta no confirmada se bloquea en DB. | RNF-063 |
| TEST-361 | Cuenta suspendida se bloquea en DB. | RNF-063 |
| TEST-362 | Cada destinatario lista solo sus filas. | RF-097 |
| TEST-363 | SELECT directo queda aislado por RLS. | RF-097 |
| TEST-364 | RPC devuelve allowlist exacto. | RF-105 |
| TEST-365 | Título y cuerpo españoles provienen del registro. | RF-098 |
| TEST-366 | Payload omite identidad y datos privados. | RF-105 |
| TEST-367 | Ocho tipos MOD-06..10 siguen disponibles. | RF-098 |
| TEST-368 | Orden newest-first desempata por ID. | RF-099 |
| TEST-369 | Límite de página acota resultados. | RF-099 |
| TEST-370 | Cursor compuesto obtiene página anterior sin solape. | RF-099 |
| TEST-371 | Cursor parcial se rechaza. | RF-099 |
| TEST-372 | Límites superiores de inbox/sync se rechazan. | RF-099 |
| TEST-373 | Reconciliación forward es determinista y no repite frontera. | RF-102 |
| TEST-374 | Conteo inicial corresponde a `read_at IS NULL`. | RF-100 |
| TEST-375 | Propietario marca su fila y DB genera timestamp. | RF-100 |
| TEST-376 | Conteo disminuye una sola vez. | RF-100 |
| TEST-377 | Repetir mark-as-read es idempotente. | RNF-065 |
| TEST-378 | Otro usuario no puede marcar la fila. | RF-100 |
| TEST-379 | Intento forjado no cambia owner ni contenido. | RF-105 |
| TEST-380 | INSERT/UPDATE/DELETE directos fallan. | RF-105 |
| TEST-381 | Hints para request/booking/conversation son correctos. | RF-101 |
| TEST-382 | Review/desconocido no recibe ruta inventada. | RF-101 |
| TEST-383 | Registros sobreviven sin canal de entrega. | RF-106 |
| TEST-384 | Contratos transaccionales MOD-06..10 siguen presentes. | RF-098 |
| TEST-385 | Preview no contiene email/coordenadas/cuerpo de chat. | RF-105 |
| TEST-386 | Normalización acepta payload válido sin alterar español. | RF-098 |
| TEST-387 | Normalización rechaza ID/campos malformados. | RF-105 |
| TEST-388 | Destino incompleto/no soportado se elimina de forma segura. | RF-101 |
| TEST-389 | Iconos cubren ocho eventos y fallback. | RF-098 |
| TEST-390 | Resolución de rutas cubre tres destinos y fallback. | RF-101 |
| TEST-391 | Mezcla deduplica y ordena páginas/Realtime. | RNF-065 |
| TEST-392 | Cursores oldest/newest preservan timestamp+ID. | RF-099 |
| TEST-393 | Agregación local distingue leídas/no leídas. | RF-100 |
| TEST-394 | Fechas recientes se expresan en español. | RNF-068 |
| TEST-395 | Fechas absolutas usan `America/La_Paz`. | RNF-068 |
| TEST-396 | Errores se mapean sin filtrar detalles internos. | RF-103 |
| TEST-397 | Suscripción filtra INSERT/UPDATE por perfil. | RF-102 |
| TEST-398 | Estados de reconexión activan reconciliación y cleanup elimina canal. | RNF-069 |
| TEST-399 | Android físico valida refresh, badge, navegación y reconexión; push queda fuera hasta decisión. | RF-103, RF-104, RF-106 |

## 3. Criterio de cierre

La validación automatizada requiere reset local, todos los pgTAP/Jest, lint SQL, tipos, lint, Expo Doctor, dependencias, export web y `git diff --check` en PASS. El dry-run debe inspeccionarse sin aplicar cambios. `TEST-399` permanecerá diferido hasta prueba Android real; no bloquea declarar completa la validación automatizada, pero no puede registrarse como PASS.

## 4. Evidencia

| Control | Resultado |
|---|---|
| Reset local | **PASS**: aplicó MOD-01 a MOD-11 desde cero. |
| pgTAP | **PASS**: 11 archivos / 683 aserciones; MOD-11 62/62. |
| Schema lint | **PASS**: `public/private`, sin errores. |
| TypeScript | **PASS** (`npx tsc --noEmit`). |
| ESLint | **PASS** (`npm run lint`). |
| Jest | **PASS**: 14 suites / 157 pruebas. |
| Expo Doctor | **PASS**: 21/21. |
| Dependencias Expo | **PASS**: alineadas con SDK 57. |
| Expo web export | **PASS**. |
| `git diff --check` | **PASS**. |
| Migration dry-run | **PASS** como inspección: propone únicamente `20261004020000_mod11_notifications.sql`; no aplicó cambios. |
| `TEST-399` Android físico | **DIFERIDO**. |
| Push Android/EAS/FCM | **DIFERIDO** por decisión/provisión externa pendiente. |

No se ejecutó despliegue remoto. Los warnings `console.warn` de Jest corresponden a casos deliberados de mapeo seguro de errores y no representan fallas.
