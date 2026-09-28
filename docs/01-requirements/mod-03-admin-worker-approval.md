# Contrátame! — Requisitos de MOD-03

## Aprobación administrativa de trabajadores

**Módulo:** `MOD-03`

**Estado:** Completo y validado

**Implementación:** `IMP-005`

## 1. Reglas aprobadas

- El panel administrativo reutiliza Supabase Auth, la base de datos y Storage del sistema; no crea identidad, backend ni base separados.
- Autenticarse no concede acceso administrativo. La capacidad proviene exclusivamente de `user_roles.role = 'admin'` para una cuenta confirmada y activa.
- El administrador revisa la instantánea inmutable de `worker_approval_requests.profile_snapshot`, no una reconstrucción silenciosa con datos profesionales vivos.
- Solo la solicitud `pending` actual de un worker `pending_approval` puede decidirse y cada solicitud se procesa una sola vez.
- Aprobar y rechazar son operaciones PostgreSQL controladas, atómicas y autorizadas. El cliente no actualiza estados directamente.
- El rechazo exige un motivo Unicode recortado de 10–500 caracteres. El mismo worker queda editable y un reenvío crea una nueva solicitud histórica.
- La revisión puede leer activos privados de portafolio y ubicación exacta únicamente bajo autorización administrativa; no concede escritura administrativa sobre datos del worker ni vuelve público el bucket.
- Aprobación administrativa y certificación siguen siendo conceptos separados.

## 2. Requisitos funcionales

### RF-023 — Autenticar y autorizar al administrador

El panel permitirá login por correo/contraseña de Supabase y verificará en base de datos la capacidad `admin` antes de entrar.

**Aceptación:** anónimo va a login; autenticado sin rol ve acceso denegado; admin confirmado/activo entra; no hay registro, selector de rol, credenciales hardcodeadas ni confianza exclusiva en navegación cliente.

### RF-024 — Mostrar resumen administrativo mínimo

El dashboard mostrará conteos reales de solicitudes pendientes y revisadas con acceso a la cola.

**Aceptación:** no incluye métricas, ingresos, certificación ni analítica ficticia.

### RF-025 — Listar solicitudes por estado

El administrador podrá consultar solicitudes `pending`, `approved` y `rejected`.

**Aceptación:** cada fila usa datos reales, estado, fecha, ciudad/departamento y cantidad de servicios del snapshot; usuarios normales no acceden a la cola.

### RF-026 — Revisar la instantánea enviada

El detalle presentará identidad mínima, fecha, estado, perfil profesional, servicios, zona, disponibilidad, portafolio e historial.

**Aceptación:** `profile_snapshot` es la fuente primaria; la ubicación exacta y URLs firmadas son exclusivas del acceso administrativo; el historial conserva decisiones y motivos previos.

### RF-027 — Aprobar la solicitud pendiente actual

Una RPC admin aprobará atómicamente una solicitud válida.

**Aceptación:** autentica y autoriza al llamador, bloquea solicitud/worker, exige solicitud pendiente actual y worker `pending_approval`, registra resultado/reviewer/hora, cambia worker a `approved`, escribe auditoría y rechaza decisiones repetidas o obsoletas.

### RF-028 — Rechazar con motivo

Una RPC admin rechazará atómicamente una solicitud válida con motivo obligatorio.

**Aceptación:** aplica las verificaciones de RF-027; motivo recortado de 10–500; registra resultado/reviewer/hora/motivo, cambia worker a `rejected` y escribe auditoría.

### RF-029 — Preservar historial y reenvío

Las solicitudes revisadas serán de solo lectura; un worker rechazado editará el mismo perfil y generará una nueva solicitud al reenviar.

**Aceptación:** la solicitud previa no se sobrescribe; una solicitud histórica no expone acciones; un navegador o segundo admin tardío falla también en backend; solo existe una solicitud pendiente por worker.

### RF-030 — Reflejar decisión en móvil

El móvil continuará derivando su experiencia de `worker_profiles.approval_status` y mostrará al worker rechazado el último motivo disponible.

**Aceptación:** `approved` muestra estado aprobado; `rejected` habilita corrección del mismo perfil y presenta el motivo; MOD-01 y el flujo congelado de MOD-02 no cambian.

## 3. Requisitos no funcionales

### RNF-015 — Autorización administrativa de mínimo privilegio

RLS y RPC verifican el rol persistido, cuenta activa/correo confirmado y actor actual. No se aceptan IDs de administrador suministrados por el cliente.

### RNF-016 — Integridad, atomicidad y concurrencia

Las decisiones bloquean y revalidan solicitud/worker, son atómicas y hacen que solo una decisión concurrente pueda tener éxito.

### RNF-017 — Privacidad de revisión

La cola, snapshots, ubicación exacta, historial y activos privados no se amplían a usuarios normales. Storage permanece privado y el panel solo genera URLs temporales de rutas incluidas en el snapshot.

### RNF-018 — Auditoría

Cada decisión exitosa agrega un evento al modelo congelado `audit_logs` con actor, solicitud, worker, acción y momento; los clientes carecen de mutación directa.

### RNF-019 — Mantenibilidad del panel

`apps/admin` usa Next.js App Router, TypeScript estricto, Supabase SSR y separación entre páginas, acceso a datos, autorización, validación y acciones.

### RNF-020 — Trazabilidad y regresión

`RF-023..030` y `RNF-015..020` enlazan `MOD-03`, `TEST-054..079`, migración e `IMP-005`; MOD-01/MOD-02 mantienen sus pruebas.

## 4. Fuera de alcance

Certificación/pagos; búsqueda; solicitudes de servicio, cotizaciones y reservas; reviews; chat; notificaciones; administración general de usuarios/categorías/reportes; edición administrativa del perfil; impersonación; auto-registro admin; analítica; publicación automática adicional.

## 5. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-023..RF-030` | `MOD-03` | `TEST-054..TEST-079` | `IMP-005` |
| `RNF-015..RNF-020` | `MOD-03` | `TEST-054..TEST-079` | `IMP-005` |

## 6. Estado de cumplimiento

`RF-023..RF-030` y `RNF-015..RNF-020` quedaron implementados y validados. La evidencia consolidada se registra en `docs/06-testing/MOD-03-test-plan.md` y `docs/07-implementation-log/IMP-005-mod-03-admin-worker-approval.md`.
