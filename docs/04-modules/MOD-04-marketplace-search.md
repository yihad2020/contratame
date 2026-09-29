# MOD-04 — Marketplace / Explorar

**Estado:** Completo y validado  
**Requisitos:** `RF-031..RF-041`, `RNF-021..RNF-027`  
**Pruebas:** `TEST-080..TEST-109`  
**Registro:** `IMP-006`

## 1. Objetivo y responsabilidades

MOD-04 publica el primer marketplace funcional para clientes autenticados. Permite explorar, buscar, filtrar, ordenar y paginar workers aprobados mediante un único contrato PostgreSQL seguro; añade distancia opcional sin revelar la base privada.

## 2. Datos y frontera pública

```text
cliente active + confirmado
        │
        ▼
search_marketplace_workers(...)
        │
        ├── profiles active
        ├── worker_profiles approved
        ├── service_categories active
        ├── worker_services active
        ├── worker_availability active (filtro opcional)
        └── worker_locations.private_location (uso interno PostGIS)
                    │
                    ▼
     salida explícita sin geometrías ni datos de revisión
```

La salida contiene solo `worker_id`, `display_name`, bio, experiencia, zona/ciudad/departamento, radio de servicio, servicio/categoría coincidente, precio opcional, distancia opcional y `total_count`. `display_name` minimiza el apellido a su inicial. No se devuelve `profile_id`, `private_location`, `public_location`, `worker_approval_requests`, estado interno, contacto, email, roles ni rutas privadas de Storage.

## 3. Contrato de búsqueda

`search_marketplace_workers` acepta texto, categoría, ciudad, departamento, coordenada efímera del cliente, radio opcional, tipo/rango de precio, experiencia mínima, día de disponibilidad, orden, offset y límite.

- Texto: título/descripcion de servicio, categoría y bio, sin distinguir mayúsculas/minúsculas.
- Ubicación: exige latitud/longitud juntas; el worker debe cubrir al cliente con `service_radius_m`; el radio de búsqueda opcional limita adicionalmente a 1–50 km.
- Precio: rango solo sobre servicios con monto; ordenar por precio exige un tipo comparable concreto.
- Disponibilidad: existencia de al menos un rango activo para el día 0–6.
- Resultado: una fila por worker, eligiendo un servicio coincidente de manera determinística.
- Paginación: offset/limit sobre un orden total y estable, máximo 20 filas, con `total_count`.

## 4. Ordenamiento

- `default`: orden de categoría, título de servicio y `worker_id`.
- `distance`: distancia ascendente y `worker_id`; exige ubicación.
- `experience_desc`: años descendentes y `worker_id`.
- `price_asc`: precio ascendente y `worker_id`; exige `hourly`, `daily` o `fixed`.

No existe ranking por reputación, popularidad o recomendación.

## 5. Experiencia móvil

- Ruta protegida `/(app)/explore`, enlazada desde Home y navegación inferior.
- Búsqueda textual, chips de categoría, filtros desplegables y orden permitido.
- Ubicación foreground opcional mediante `expo-location`; permanece en memoria de pantalla.
- Tarjetas compactas sin estrellas ni dirección exacta.
- Carga inicial, recarga, vacío, error y carga de página adicional.
- Ruta `/(app)/worker/[workerId]` como transición mínima para MOD-05, sin fabricar un perfil público.

## 6. Seguridad y privacidad

- RPC `SECURITY DEFINER` con `search_path = ''`, objetos calificados y `auth.uid()`.
- Ejecución revocada a `public`/`anon` y concedida solo a `authenticated`.
- La RPC vuelve a exigir correo confirmado y cuenta activa mediante la frontera MOD-01.
- No se cambian las políticas owner/admin ni se concede SELECT marketplace a tablas privadas.
- PostGIS usa `private_location` solo internamente y retorna distancia redondeada.
- La app usa únicamente la clave publicable; no hay secretos ni `service_role`.

## 7. Rendimiento

La migración agrega índices enfocados para elegibilidad aprobada, servicios/categorías activos, disponibilidad y texto con `pg_trgm`; reutiliza el GIST existente de `private_location`. Cada página se resuelve con una RPC y evita consultas por tarjeta.

## 8. Fuera de alcance

Perfil público completo, portafolio público, mapas con workers, solicitudes, cotizaciones, reservas, reseñas, favoritos, chat, notificaciones, certificación y pagos.

## 9. Decisiones no resueltas

MOD-04 no define `public_location`, un radio global automático, reputación, popularidad ni reglas del perfil MOD-05. Esos datos no se simulan.

## 10. Validación final

MOD-04 quedó completo y validado dentro del alcance automatizado aprobado. El reset local aplicó MOD-01 a MOD-04 y pgTAP aprobó **4 archivos / 213 aserciones**, incluidas **54/54** de MOD-04. Aprobaron TypeScript, ESLint, Jest (**6 suites / 61 pruebas**), Expo Doctor (**21/21**), alineación de dependencias Expo, export web y `git diff --check`; sus avisos LF/CRLF fueron informativos.

La compatibilidad de Jest conserva `jest-expo` y agrega a `moduleDirectories`, después de `node_modules`, la ruta relativa `<rootDir>/node_modules/expo/node_modules`. `expo-modules-core` permanece transitiva bajo Expo y no es una dependencia directa.

La migración `20260928010000_mod04_marketplace_search.sql` fue aplicada satisfactoriamente al proyecto Supabase de desarrollo vinculado. Los historiales local y remoto están sincronizados y el lint vinculado de los esquemas `public`/`private` informó `No schema errors found`.

Las pruebas confirmaron elegibilidad exclusiva de workers aprobados, exclusión de cuentas/workers/servicios no elegibles, allowlist segura, ausencia de coordenadas privadas, bloqueo de lectura cruzada de ubicaciones y bloqueo anónimo. Búsqueda, filtros, PostGIS, orden y paginación quedaron validados localmente.

No existe confirmación explícita de un smoke test manual en Android. Esa comprobación queda diferida a la integración móvil continua y a las pruebas E2E finales; no se registra como aprobada.
