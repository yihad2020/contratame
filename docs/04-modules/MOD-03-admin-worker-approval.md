# MOD-03 — Aprobación administrativa de trabajadores

**Estado:** Completo y validado

**Requisitos:** `RF-023..RF-030`, `RNF-015..RNF-020`

**Pruebas:** `TEST-054..TEST-079`

**Registro:** `IMP-005`

## 1. Objetivo

MOD-03 incorpora el primer panel web administrativo para revisar la instantánea de un envío profesional, aprobarla o rechazarla con motivo y preservar historial/auditoría. No permite editar datos del trabajador ni amplía el marketplace.

## 2. Componentes

- `apps/admin`: Next.js App Router, Server Components/Actions y Supabase SSR con clave publicable.
- `get_my_admin_access()`: comprobación cerrada de cuenta confirmada/activa y `user_roles.role = 'admin'`.
- `approve_worker_submission(request_id)`: decisión positiva atómica.
- `reject_worker_submission(request_id, reason)`: decisión negativa atómica con motivo validado.
- `audit_logs`: implementación del modelo append-only ya congelado en el esquema lógico.
- Políticas RLS existentes de MOD-02: lectura owner/admin de worker, solicitud, ubicación y Storage; MOD-03 agrega lectura de contexto de `profiles` solo para admin.

## 3. Acceso

```text
anónimo → /login
autenticado no-admin → /access-denied
admin confirmado y active → dashboard / cola / detalle
```

El layout protegido ejecuta `auth.getUser()` y `get_my_admin_access()` en servidor. Las RPC repiten la autorización en PostgreSQL; ocultar botones nunca es la frontera de seguridad.

## 4. Revisión y decisiones

El detalle usa `profile_snapshot` como fuente de bio/experiencia, servicios/precios, ubicación/radio, disponibilidad y portafolio. El perfil vivo se usa solo para identidad mínima y estado actual. Las URLs de portafolio son firmadas temporalmente desde rutas incluidas en el snapshot.

Ambas decisiones bloquean primero la solicitud y luego el worker, verifican que la solicitud siga `pending`, sea la más reciente y el worker siga `pending_approval`. Después registran solicitud, worker y auditoría dentro de la misma transacción implícita de la función. Una segunda operación observa el resultado terminal y falla.

## 5. Rechazo y móvil

El motivo se recorta y valida en UI y base de datos. Tras rechazo, MOD-02 permite editar el mismo `worker_profiles`; el nuevo envío agrega otra solicitud. El móvil consulta el último motivo rechazado del historial propio y lo muestra sin alterar onboarding.

## 6. Seguridad y privacidad

- Sin `service_role` ni secretos privilegiados en Next.js.
- Sin SELECT de `user_roles` desde el cliente; la comprobación es una RPC mínima.
- Sin UPDATE directo de estados ni historial.
- Sin RLS deshabilitada ni acceso normal a coordenadas/snapshots ajenos.
- Bucket `worker-portfolio` privado; admin tiene lectura y no escritura administrativa.
- `audit_logs` sin privilegios directos para `anon` o `authenticated`.

## 7. Operación inicial

La creación/identificación de la primera cuenta admin y la concesión de `user_roles` se realiza por un procedimiento operativo autorizado fuera de la aplicación. El panel no ofrece auto-registro ni promoción de roles.

## 8. Validación

MOD-03 quedó completo y validado dentro del alcance aprobado. El reset local aplicó MOD-01, MOD-02 y MOD-03; las tres suites pgTAP aprobaron 159 aserciones. También aprobaron typecheck, lint, Vitest y build de producción del panel administrativo, además de las comprobaciones de regresión móvil.

El historial de migraciones del proyecto Supabase vinculado está sincronizado hasta `20260922010000_mod03_admin_worker_approval.sql` y el lint del esquema vinculado aprobó. La integración real con Supabase de desarrollo confirmó acceso exclusivo de administrador, protección frente a anónimos y no administradores, revisión del snapshot inmutable y portafolio, aprobación, rechazo con motivo, reflejo móvil de ambos estados, edición y reenvío del mismo perfil rechazado, preservación del historial y rechazo de decisiones obsoletas o repetidas.
