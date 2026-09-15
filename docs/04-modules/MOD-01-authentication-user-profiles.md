# MOD-01 — Autenticación y perfiles de usuario

**Estado:** Primera implementación  
**Requisitos:** `RF-001..RF-010`, `RNF-001..RNF-007`  
**Pruebas:** `TEST-001..TEST-025`  
**Registro:** `IMP-001`

## 1. Objetivo y responsabilidades

MOD-01 proporciona la base previa a toda funcionalidad de trabajador:

- registro e inicio de sesión por correo/contraseña con Supabase Auth;
- confirmación y reenvío de correo;
- cierre y restauración de sesión móvil;
- aprovisionamiento automático del perfil general;
- lectura del perfil propio y edición controlada de nombre, apellido y teléfono;
- evaluación cerrada de correo confirmado, perfil existente y estado de cuenta;
- separación de cliente, futura capacidad de trabajador y privilegios administrativos.

## 2. Modelo de identidad

```text
Supabase Auth                         Contrátame!
auth.users                            public.profiles
id ────────────────────────────────► id (PK y FK, 1:1)
email + credenciales                  first_name, last_name, phone
email_confirmed_at                    avatar_path, account_status
```

`auth.users` es externa y autoritativa para identidad, correo, contraseña y sesión. Un trigger `AFTER INSERT`, `SECURITY DEFINER` y con `search_path` vacío toma de `raw_user_meta_data` solo nombre, apellido y teléfono, valida esos datos y crea el perfil `active`. El fallo del perfil aborta el alta completa.

Todo usuario normal puede ser cliente sin rol persistido. `worker_profiles` agregará más adelante la capacidad profesional. `user_roles` representa privilegios administrativos separados; MOD-01 crea su estructura congelada, pero no asigna ni administra roles.

## 3. Flujos

### Registro y verificación

```text
Formulario válido → auth.signUp(metadata) → auth.users
                                      └→ trigger → profiles(active)
                         ↓
              correo de confirmación
                         ↓
       enlace contratame://verify-email → sesión → evaluación de acceso
```

No se realiza consulta de correo previa al alta. Supabase determina la respuesta para cuentas existentes. El reenvío usa el control de frecuencia de Supabase, sin temporizador de negocio propio. La acción “Ya lo verifiqué” obtiene un usuario actualizado mediante Supabase Auth; si ya fue confirmado, reevalúa el estado y el perfil antes de salir de la pantalla de verificación.

### Sesión y navegación

```text
sin sesión ───────────────► login/registro
sesión no confirmada ─────► verificar correo
confirmada + sin perfil ──► error cerrado
confirmada + active ──────► inicio/perfil
confirmada + suspended ───► pantalla bloqueada
confirmada + deactivated ─► pantalla bloqueada
```

La navegación expresa el estado, pero PostgreSQL/RLS sigue siendo la frontera de autorización.

### Perfil propio

- Estado: RPC mínima para conocer el estado propio después de confirmar el correo.
- Lectura: `SELECT` de la propia fila, con correo confirmado y estado `active`.
- Edición: RPC `update_my_profile`, solo para cuenta confirmada y `active`.
- Campos editables: `first_name`, `last_name`, `phone`.
- Campos no editables: `id`, correo, contraseña, `avatar_path`, `account_status`, timestamps y roles.

## 4. Componentes implementados

| Componente | Responsabilidad |
|---|---|
| `apps/mobile/src/app` | Rutas Expo Router y estados visibles. |
| `modules/auth` | Sesión, deep link, validación y evaluación de acceso. |
| `modules/profile` | Lectura de perfil y RPC de actualización. |
| `lib/supabase.ts` y `lib/auth-storage.*` | Cliente público; sesión nativa cifrada mediante `LargeSecureStore` y adaptador web separado. |
| `supabase/config.toml` | Confirmación por correo y contraseña mínima local. |
| Migración MOD-01 | Tablas congeladas, trigger, funciones, grants y RLS. |

## 5. Seguridad y RLS

- `anon` no tiene acceso a `profiles` ni `user_roles`.
- `authenticated` puede seleccionar solo su perfil y solo si Auth confirma el correo.
- No se concede `INSERT`, `UPDATE` o `DELETE` directo sobre `profiles`.
- El único cambio de perfil del cliente pasa por una función controlada que verifica propietario, confirmación y estado `active`.
- `authenticated` no puede leer ni mutar `user_roles`.
- Las funciones privilegiadas fijan `search_path = ''` y califican sus objetos por esquema.
- Un JWT todavía válido no evita el bloqueo por estado: la base consulta `profiles.account_status` en cada operación protegida.
- No se usa el mecanismo de ban de Auth para representar `suspended` o `deactivated`.
- En Android/iOS, el patrón oficial `LargeSecureStore` guarda el valor cifrado en AsyncStorage y solo la clave AES-256 en Expo SecureStore, evitando almacenar directamente sesiones grandes en SecureStore. Web conserva un adaptador AsyncStorage explícito.

## 6. Fuera de alcance

Perfiles y aprobación de trabajadores; servicios, ubicación y portafolio; búsqueda pública; solicitudes, cotizaciones, reservas y reseñas; chat y notificaciones; certificación y pagos; panel administrativo; asignación de roles o estados; recuperación/cambio de credenciales; avatar/Storage; cierre global; eliminación o reactivación de cuentas.

## 7. Configuración operativa

1. Copiar `apps/mobile/.env.example` a `.env` y completar URL y clave publicable de Supabase.
2. Registrar `contratame://verify-email` en las URL de redirección del proyecto remoto.
3. Aplicar la migración en un entorno de desarrollo reproducible.
4. No usar una clave `service_role` en Expo.

## 8. Decisiones todavía pendientes

Permanecen pendientes solo los comportamientos enumerados en la sección 4 del documento de requisitos. No deben bloquear ni expandir esta primera implementación.
