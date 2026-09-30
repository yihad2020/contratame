# Contrátame! — Plan de pruebas de MOD-06

**Módulo:** `MOD-06`  
**Casos:** `TEST-140..TEST-179`  
**Implementación:** `IMP-008`  
**Estado:** Validación local automatizada aprobada; dry-run vinculado bloqueado y Android real diferido

## 1. Estrategia

- pgTAP: contrato, grants/RLS, elegibilidad, actor derivado, datos, PostGIS, acompañantes, rollback, participantes, privacidad, estados y paginación.
- Jest: validación/normalización, selección de servicio, coordenadas, payload, errores, respuesta y deduplicación.
- Aplicación: TypeScript, ESLint, Expo Doctor, alineación SDK 57 y export web.
- Regresión: reset local y suites completas MOD-01–06.
- Supabase vinculado: solo `db push --dry-run`; no se despliega MOD-06.

## 2. Casos

| ID | Escenario esperado | Requisitos | Evidencia |
|---|---|---|---|
| `TEST-140` | Tablas, RPC, firmas, `SECURITY DEFINER`, `search_path`, grants y RLS coinciden con contrato. | `RNF-033`, `RNF-035` | pgTAP |
| `TEST-141` | Cliente elegible crea solicitud `pending` para worker/servicio elegibles. | `RF-049`, `RF-050` | pgTAP |
| `TEST-142` | Cliente se deriva de `auth.uid()` y no del payload. | `RF-049`, `RNF-033` | pgTAP |
| `TEST-143` | Firma no acepta customer ni status forjables. | `RF-049`, `RF-057` | pgTAP/Jest |
| `TEST-144` | Worker `draft` se rechaza. | `RF-050` | pgTAP |
| `TEST-145` | Worker `pending_approval` se rechaza. | `RF-050` | pgTAP |
| `TEST-146` | Worker `rejected` se rechaza. | `RF-050` | pgTAP |
| `TEST-147` | Worker `suspended` se rechaza. | `RF-050` | pgTAP |
| `TEST-148` | Cuenta del worker suspendida/deactivated se rechaza. | `RF-049`, `RF-050` | pgTAP |
| `TEST-149` | Servicio inactivo se rechaza. | `RF-050` | pgTAP |
| `TEST-150` | Relación worker/servicio incorrecta se rechaza. | `RF-050`, `RNF-035` | pgTAP |
| `TEST-151` | Categoría inactiva se rechaza. | `RF-050` | pgTAP |
| `TEST-152` | Descripción vacía/límites y campos opcionales inválidos se rechazan. | `RF-051` | pgTAP/Jest |
| `TEST-153` | Coordenadas ausentes, `NaN` o fuera de rango se rechazan. | `RF-052` | pgTAP/Jest |
| `TEST-154` | Punto y dirección normalizada se almacenan en `service_request_locations`. | `RF-052` | pgTAP |
| `TEST-155` | Conversación `active` 1:1 se crea con la solicitud. | `RF-053` | pgTAP |
| `TEST-156` | Notificación receptora referencia la solicitud. | `RF-053` | pgTAP |
| `TEST-157` | Falla del último acompañante revierte solicitud, ubicación, conversación y notificación. | `RF-053`, `RNF-035` | pgTAP |
| `TEST-158` | Cliente lista solo sus solicitudes. | `RF-054` | pgTAP |
| `TEST-159` | Cliente lee detalle propio con ubicación exacta. | `RF-052`, `RF-054` | pgTAP |
| `TEST-160` | Cliente ajeno no lista ni lee la solicitud. | `RF-054`, `RNF-033` | pgTAP |
| `TEST-161` | Worker destinatario lista la solicitud. | `RF-055` | pgTAP |
| `TEST-162` | Worker ve detalle y zona, pero dirección/coordenadas son nulas. | `RF-052`, `RF-055` | pgTAP |
| `TEST-163` | Worker ajeno no lista ni lee la solicitud. | `RF-055`, `RNF-033` | pgTAP |
| `TEST-164` | `anon` no ejecuta RPC ni lee tablas. | `RNF-033` | pgTAP |
| `TEST-165` | Cliente no inserta acompañantes ni actualiza/elimina estado interno. | `RF-057`, `RNF-033` | pgTAP |
| `TEST-166` | Constraint admite solo los seis estados congelados. | `RF-057` | pgTAP |
| `TEST-167` | Paginación es acotada, estable, sin duplicados y con conteo total. | `RF-054`, `RNF-036` | pgTAP/Jest |
| `TEST-168` | Marketplace/perfil público y listas no exponen ubicación transaccional. | `RF-052`, `RNF-034` | pgTAP |
| `TEST-169` | Caller sin confirmar o suspendido falla cerrado. | `RF-049`, `RNF-033` | pgTAP |
| `TEST-170` | Formulario exige un servicio del allowlist del worker. | `RF-050` | Jest/manual |
| `TEST-171` | Cliente normaliza espacios sin truncar descripción, zona o dirección. | `RF-051` | Jest |
| `TEST-172` | Cliente valida fecha, hora, presupuesto y ubicación. | `RF-051`, `RF-052` | Jest |
| `TEST-173` | Payload RPC contiene campos aprobados y omite customer/status. | `RF-049`, `RNF-033` | Jest |
| `TEST-174` | Errores de backend se convierten en mensajes seguros sin SQL crudo. | `RNF-034`, `RNF-037` | Jest |
| `TEST-175` | Lista/detalle normalizan numeric, time y coordenadas nulas. | `RF-054`, `RF-055` | Jest |
| `TEST-176` | UI reconoce exactamente los seis estados congelados. | `RF-057` | Jest |
| `TEST-177` | Unión de páginas deduplica por `request_id`. | `RNF-036` | Jest |
| `TEST-178` | CTA, revisión, éxito, tabs cliente/worker y detalle navegan en Android real. | `RF-056`, `RNF-037` | Manual diferida |
| `TEST-179` | MOD-01 a MOD-05 conservan migraciones, contratos y suites. | `RNF-038` | Suite completa |

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
git diff --check
npx --yes supabase@2.118.0 db push --dry-run
```

El dry-run es solo inspección. No ejecutar `db push` ni aplicar MOD-06 remotamente.

## 4. Verificación manual diferida

La validación automatizada no sustituye Android real: permiso de ubicación concedido/denegado, toque de mapa, teclado, revisión/envío contra Supabase de desarrollo, visibilidad cruzada con dos clientes/dos workers y privacidad antes/después de un booking futuro. Si no se ejecuta, permanece diferida y no se presenta como PASS.

## 5. Criterio de salida

Reset, las seis suites pgTAP, TypeScript, lint, Jest, Expo Doctor, alineación, export y diff deben aprobar. El dry-run debe listar solo MOD-06 sin aplicarlo. La integración real y Android pueden quedar pendientes si se registran expresamente.

## 6. Resultado de validación — 2026-09-29

| Área | Resultado |
|---|---|
| Supabase local | Reset aprobado; aplicó MOD-01 a MOD-06. |
| pgTAP | **6 archivos / 331 aserciones aprobadas**; MOD-06 aprobó **68/68**. |
| TypeScript y ESLint | Aprobados. |
| Jest | **8 suites / 82 pruebas aprobadas**, sin snapshots. |
| Expo | Dependencias alineadas; Expo Doctor **21/21**. |
| Export web | Aprobado, incluidas las rutas nuevas de Expo Router. |
| `git diff --check` | Aprobado; avisos LF/CRLF únicamente informativos. |
| Dry-run vinculado | **Bloqueado/no ejecutado**: el entorno rechazó contactar un destino Supabase vinculado no verificado. No se aplicaron cambios remotos. |
| Supabase real / Android | No ejecutado; diferido a validación de integración y dispositivo. |

La implementación no se marca como validada remotamente mientras el dry-run y las comprobaciones reales permanezcan pendientes.
