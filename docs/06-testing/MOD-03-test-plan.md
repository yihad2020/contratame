# Contrátame! — Plan de pruebas de MOD-03

**Módulo:** `MOD-03`

**Casos:** `TEST-054..TEST-079`

**Implementación:** `IMP-005`

**Estado:** Completo y validado; resultados registrados en `IMP-005`

## 1. Estrategia

- pgTAP: autorización negativa, lectura admin, snapshot/Storage privados, decisiones, auditoría, terminalidad, rechazo/reenvío e historial.
- Admin: unitarias para motivo, TypeScript, ESLint y build Next.js.
- Regresión móvil: TypeScript, lint, Jest, Expo Doctor y export web.
- Supabase local: reset limpio, todas las suites pgTAP y lint de esquema local.
- Supabase de desarrollo: checklist manual sin `service_role` en clientes.

## 2. Casos

| ID | Escenario esperado |
|---|---|
| `TEST-054` | Anónimo no accede a funcionalidad admin. |
| `TEST-055` | Autenticado no-admin ve acceso denegado y no lista datos. |
| `TEST-056` | Worker normal no llama approve RPC. |
| `TEST-057` | Worker normal no llama reject RPC. |
| `TEST-058` | Admin lista solicitudes pendientes reales. |
| `TEST-059` | Admin lee la instantánea inmutable. |
| `TEST-060` | Admin obtiene lectura temporal del portafolio privado enviado. |
| `TEST-061` | Admin aprueba la solicitud pendiente actual. |
| `TEST-062` | Aprobación cambia worker a `approved`. |
| `TEST-063` | Aprobación registra resultado, reviewer y hora. |
| `TEST-064` | Historial/snapshot se preserva al aprobar. |
| `TEST-065` | Una solicitud aprobada no vuelve a aprobarse. |
| `TEST-066` | Una solicitud aprobada no puede rechazarse después. |
| `TEST-067` | Admin rechaza la solicitud pendiente actual. |
| `TEST-068` | Motivo de rechazo es obligatorio y 10–500 tras trim. |
| `TEST-069` | Rechazo cambia worker a `rejected`. |
| `TEST-070` | Rechazo registra resultado, reviewer, hora y motivo. |
| `TEST-071` | Worker rechazado vuelve a editar bajo reglas MOD-02. |
| `TEST-072` | Worker rechazado reenvía el mismo perfil. |
| `TEST-073` | Reenvío crea una solicitud nueva. |
| `TEST-074` | Solicitud rechazada anterior queda inmutable. |
| `TEST-075` | Solicitud histórica/obsoleta no altera estado actual. |
| `TEST-076` | Segundo admin no procesa una solicitud ya decidida; locks serializan decisiones concurrentes. |
| `TEST-077` | Coordenadas privadas siguen invisibles para usuarios normales. |
| `TEST-078` | La revisión no modifica datos profesionales enviados. |
| `TEST-079` | MOD-01 y MOD-02 conservan sus suites y contratos. |

## 3. Checklist Supabase de desarrollo

1. Crear/identificar una cuenta administrativa y conceder `admin` mediante configuración autorizada.
2. Confirmar que una cuenta no-admin queda bloqueada del panel.
3. Confirmar que un worker pendiente aparece y su detalle coincide con el snapshot.
4. Abrir una imagen privada de portafolio mediante URL firmada temporal.
5. Aprobar y confirmar el estado `approved` en móvil.
6. Preparar otro worker, rechazar con motivo y confirmar corrección/motivo en móvil.
7. Editar/re-enviar el mismo worker y confirmar dos solicitudes históricas.
8. Desde segundo admin o pestaña obsoleta, confirmar que la segunda decisión falla.
9. Como usuario normal, invocar directamente ambas RPC y confirmar `42501`.
10. Confirmar que no se concedió escritura admin de portafolio ni lectura normal de ubicación privada.

Registrar proyecto, fecha y evidencia redactada; no guardar tokens, contraseñas ni coordenadas exactas.

## 4. Ejecución

```powershell
npx supabase db reset --local
npx supabase test db
npx supabase db lint --local
npx supabase db push --dry-run

Set-Location apps/admin
npm run typecheck
npm run lint
npm test
npm run build

Set-Location ../mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo export --platform web
```

Nunca ejecutar `supabase db push` remoto como parte automática de MOD-03.

## 5. Resultado de validación confirmado

| Área | Resultado confirmado |
|---|---|
| Supabase local | El reset aplicó correctamente MOD-01, MOD-02 y MOD-03. pgTAP aprobó **3 archivos / 159 aserciones**. |
| Panel administrativo | Typecheck, lint, Vitest y build de producción de Next.js aprobados. |
| Regresión móvil | Las comprobaciones de regresión móvil aprobaron. |
| Supabase vinculado | Historial de migraciones sincronizado hasta `20260922010000_mod03_admin_worker_approval.sql`; lint del esquema vinculado aprobado. |
| Integración real | La integración administrativa con Supabase de desarrollo aprobó. |
| Acceso | El acceso anónimo y no administrador quedó bloqueado; aprobación y rechazo privilegiados permanecen exclusivos del administrador. |
| Cola y revisión | El worker pendiente aparece en la revisión administrativa; funcionan la revisión del snapshot inmutable y la revisión del portafolio. |
| Decisiones | Funcionan aprobación y rechazo con motivo; una solicitud obsoleta o ya revisada no puede procesarse otra vez. |
| Móvil y reenvío | El móvil refleja los estados aprobado y rechazado; el worker rechazado puede editar y reenviar el mismo perfil. |
| Historial | El historial de aprobación permanece preservado después de las decisiones y reenvíos. |

Con estos resultados, `TEST-054..TEST-079` satisfacen el criterio de salida y MOD-03 queda **completo y validado**.
