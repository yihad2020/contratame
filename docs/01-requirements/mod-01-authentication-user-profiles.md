# Contrátame! — Requisitos de MOD-01

## Autenticación y perfiles de usuario

**Módulo:** `MOD-01`  
**Estado:** Aprobado para la primera implementación  
**Implementación:** `IMP-001`

## 1. Reglas aprobadas

- Supabase Auth es la única fuente de identidad, credenciales y correo electrónico.
- El acceso inicial usa correo y contraseña; el correo debe confirmarse antes del acceso protegido.
- Cada alta en `auth.users` aprovisiona exactamente una fila 1:1 en `public.profiles`.
- Los nombres y el teléfono opcional se envían como metadata de registro y se copian al perfil; el correo no se copia.
- Toda cuenta nueva inicia con `account_status = 'active'`.
- Todo usuario normal puede actuar como cliente. Cliente no es un rol exclusivo ni requiere tabla propia.
- La capacidad de trabajador llegará mediante `worker_profiles`; no pertenece a `MOD-01`.
- Los privilegios administrativos permanecen separados en `user_roles` y nunca se aceptan desde el cliente.
- Una sesión válida solo obtiene acceso protegido si el correo está confirmado y el perfil está `active`.
- Las cuentas `suspended` y `deactivated` no acceden a funciones protegidas. `MOD-01` no modifica el estado interno ni el bloqueo de Supabase Auth.

## 2. Requisitos funcionales y aceptación

### RF-001 — Registrar una cuenta por correo y contraseña

La aplicación permitirá registrar una identidad con nombre, apellido, teléfono opcional, correo, contraseña y confirmación de contraseña.

**Aceptación:** nombres recortados de 2–50 y 2–80 caracteres Unicode; correo recortado; teléfono vacío o normalizado a formato internacional `+` y 8–15 dígitos; contraseña mínima de 8 caracteres; confirmación idéntica. Si Supabase rechaza el alta no se muestra éxito. No se consulta previamente si el correo existe ni se almacenan credenciales fuera de Auth.

### RF-002 — Aprovisionar el perfil 1:1

Un trigger `AFTER INSERT` sobre `auth.users` creará `public.profiles` con el mismo UUID.

**Aceptación:** existe una sola fila vinculada; se copian `first_name`, `last_name` y `phone`; `account_status` inicia `active`; `phone` puede ser nulo; no se copia el correo; datos inválidos hacen fallar el alta de forma atómica.

### RF-003 — Confirmar el correo

El usuario deberá confirmar su correo antes del acceso protegido.

**Aceptación:** el registro muestra el estado de verificación; el enlace usa el esquema `contratame://`; se puede reenviar con el mecanismo de Supabase sin cooldown propio; la comprobación manual consulta el usuario actualizado en Supabase Auth y no confía en el usuario de una sesión local obsoleta; tras confirmar se reevalúan perfil y estado de cuenta; sin confirmación no hay acceso protegido.

### RF-004 — Iniciar sesión

La aplicación permitirá iniciar sesión con correo y contraseña mediante Supabase Auth.

**Aceptación:** credenciales aceptadas y correo confirmado producen una sesión; credenciales rechazadas no la producen; un correo sin confirmar conduce al estado de verificación; la UI no decide por sí sola la identidad.

### RF-005 — Cerrar sesión

El usuario podrá cerrar la sesión del cliente actual.

**Aceptación:** se elimina el acceso local a rutas protegidas; no se eliminan identidad ni perfil; no se promete cierre global multidispositivo.

### RF-006 — Restaurar y evaluar la sesión

Al abrir la aplicación se restaurará una sesión persistida que Supabase todavía considere válida.

**Aceptación:** durante la evaluación se muestra carga neutral; una sesión ausente o inválida conduce al login; una sesión confirmada resuelve su perfil; el acceso se decide también por `account_status` sin confiar solo en navegación cliente; en Android/iOS la sesión se persiste cifrada mediante el patrón `LargeSecureStore` documentado por Supabase y en web se usa un adaptador separado.

### RF-007 — Consultar el perfil propio

Un usuario confirmado y `active` podrá consultar exclusivamente su perfil.

**Aceptación:** RLS limita la fila a `auth.uid()`; el correo se obtiene de Auth, no de `profiles`; no se exponen contraseñas ni tokens; un anónimo o usuario distinto no obtiene la fila.

### RF-008 — Actualizar el perfil propio

Una cuenta confirmada y `active` podrá actualizar solo `first_name`, `last_name` y `phone` mediante una operación controlada.

**Aceptación:** se aplican las mismas validaciones del registro; `updated_at` cambia; no hay `UPDATE` directo para el cliente; no se pueden cambiar `id`, correo, contraseña, avatar, estado, timestamps ni roles.

### RF-009 — Mantener el modelo de capacidades

El módulo mantendrá cliente como capacidad por defecto y separará trabajador y administrador.

**Aceptación:** el alta no crea `customer_profiles`, rol `customer`, `worker_profiles` ni `user_roles`; la ausencia de perfil de trabajador no limita la capacidad de cliente; ningún dato de rol enviado por el cliente concede privilegios.

### RF-010 — Aplicar estados y acceso no autorizado

El backend y la aplicación impedirán el acceso protegido a anónimos, correos no confirmados y perfiles no activos.

**Aceptación:** solo se admiten `active`, `suspended`, `deactivated`; el usuario normal no cambia estados ni roles; `suspended` y `deactivated` conservan la sesión Auth si existe, pero no pueden leer/actualizar funciones protegidas; ante perfil ausente se falla de forma cerrada.

## 3. Requisitos no funcionales y aceptación

### RNF-001 — Seguridad por defecto

RLS y operaciones controladas aplicarán autorización en PostgreSQL. **Aceptación:** alterar la UI no evita la restricción; no hay inserción arbitraria de perfiles ni mutación normal de roles; existen pruebas negativas.

### RNF-002 — Integridad de identidad y perfil

Se preservará el 1:1 entre `auth.users` y `profiles`. **Aceptación:** UUID compartido, PK/FK y trigger atómico; un perfil ausente no habilita acceso.

### RNF-003 — Protección de secretos y sesiones

No se expondrán secretos privilegiados. **Aceptación:** el cliente usa solo URL y clave publicable mediante variables `EXPO_PUBLIC_*`; `.env` no se versiona; no hay `service_role`, contraseñas ni tokens en código, tablas de negocio o logs; en Android/iOS el valor completo de sesión se cifra antes de persistirlo y la clave se guarda en Expo SecureStore.

### RNF-004 — Privacidad y mínimo privilegio

Se expondrá solo lo requerido. **Aceptación:** perfil propio únicamente; sin listado público; `user_roles` sin acceso del usuario normal; correo no duplicado.

### RNF-005 — Mantenibilidad y tipado

La implementación seguirá Expo/React Native/TypeScript estricto y separación modular. **Aceptación:** rutas presentan UI, servicios encapsulan Supabase y validaciones son reutilizables; `npm run typecheck` y `npm run lint` pasan.

### RNF-006 — Compatibilidad arquitectónica

Se usará el stack congelado sin servicios duplicados. **Aceptación:** Expo Router y Supabase; sin backend, base de datos o autenticación paralelos; configuración reproducible mediante migraciones.

### RNF-007 — Trazabilidad y verificabilidad

Los cambios conservarán trazabilidad. **Aceptación:** `RF-001..010` y `RNF-001..007` se relacionan con `MOD-01`, `TEST-001..025` e `IMP-001`; fallos o validaciones no ejecutables quedan explícitos.

## 4. Decisiones que permanecen pendientes o fuera del módulo

- Recuperación/cambio de contraseña y cambio de correo.
- Cierre global o administración multidispositivo de sesiones.
- Alta, cambio administrativo, reactivación y eliminación/anonimización de cuentas.
- Duración de suspensión y mensajes/contacto de soporte específicos.
- Avatar y políticas de Supabase Storage.
- Proveedores OAuth, teléfono como autenticador y MFA.
- Lectura/autogestión de `user_roles` y cualquier panel administrativo.
- Estrategia E2E definitiva y ambiente remoto de pruebas.

## 5. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-001..RF-010` | `MOD-01` | `TEST-001..TEST-025` | `IMP-001` |
| `RNF-001..RNF-007` | `MOD-01` | `TEST-001..TEST-025` | `IMP-001` |
