# Contrátame! — Requisitos de MOD-04

## Marketplace / Explorar

**Módulo:** `MOD-04`  
**Estado:** Completo y validado  
**Implementación:** `IMP-006`

## 1. Reglas aprobadas

- El marketplace está disponible para usuarios autenticados, con correo confirmado y cuenta `active`.
- La elegibilidad pública se impone en PostgreSQL: cuenta `active`, worker `approved`, categoría activa y servicio coincidente activo.
- Workers `draft`, `pending_approval`, `rejected` o `suspended`, cuentas no activas y servicios inactivos nunca aparecen.
- La aplicación no recibe `private_location`, coordenadas, snapshots de aprobación, datos administrativos ni campos privados de cuenta.
- La búsqueda usa una RPC controlada `SECURITY DEFINER`, `search_path = ''`, objetos calificados y permiso solo para `authenticated`; no se concede lectura pública amplia sobre tablas privadas.
- Una ubicación de cliente es opcional, se mantiene solo en memoria durante la búsqueda y se usa con PostGIS sin seguimiento continuo.
- No hay calificaciones, conteos de reseñas, estrellas, popularidad ni recomendación hasta que exista reputación real.
- Cada fila representa un worker y el servicio activo coincidente elegido determinísticamente; el mismo worker no se duplica dentro de una página.

## 2. Requisitos funcionales y aceptación

### RF-031 — Explorar workers públicamente elegibles

El usuario podrá obtener resultados reales de trabajadores disponibles para publicación.

**Aceptación:** la RPC exige una cuenta confirmada y activa; aplica en backend `profiles.account_status = 'active'`, `worker_profiles.approval_status = 'approved'`, `service_categories.active = true` y `worker_services.active = true`; no depende de filtros cliente; los demás estados no aparecen en ninguna página.

### RF-032 — Buscar por texto

El usuario podrá buscar por título y descripción del servicio, categoría y contenido profesional relevante.

**Aceptación:** la consulta recorta el texto, limita su longitud, compara sin distinguir mayúsculas y minúsculas y usa PostgreSQL; una búsqueda vacía equivale a no filtrar y una entrada inválida se rechaza sin exponer error SQL.

### RF-033 — Filtrar resultados

El usuario podrá combinar categoría, ciudad, departamento, tipo de precio, rango de precio, experiencia mínima y día de disponibilidad.

**Aceptación:** los filtros se aplican en la misma RPC; precio mínimo/máximo solo coincide con servicios que tienen precio; el día usa `worker_availability.active`; valores o combinaciones inválidas se rechazan; limpiar filtros restaura la búsqueda general.

### RF-034 — Usar proximidad opcional

El usuario podrá solicitar permiso de ubicación en primer plano para buscar workers que atienden su posición.

**Aceptación:** denegar o fallar el permiso no bloquea la navegación general; no se inicia seguimiento continuo; PostGIS calcula internamente la distancia desde `private_location`; solo se devuelve `distance_m`; se respeta el radio del worker y un radio adicional opcional de 1–50 km cuando el usuario lo selecciona.

### RF-035 — Paginar y actualizar resultados

Los resultados usarán páginas limitadas y orden estable.

**Aceptación:** tamaño por defecto móvil de 12 y máximo backend de 20; carga inicial, siguiente página, recarga, carga, vacío y fallo son explícitos; `total_count` determina si hay otra página; la app evita duplicados por `worker_id`; ninguna página evade elegibilidad.

### RF-036 — Ordenar con datos actuales

El usuario podrá ordenar solo mediante datos existentes y comparables.

**Aceptación:** orden predeterminado determinístico; distancia solo con ubicación; experiencia descendente disponible; precio ascendente solo cuando se eligió un tipo comparable `hourly`, `daily` o `fixed`; no existe orden por reputación, popularidad ni “recomendado”.

### RF-037 — Cargar categorías reales

Explorar mostrará las categorías activas administradas en `service_categories`.

**Aceptación:** no se hardcodean resultados de categorías; se ordenan por `sort_order`; una falla de catálogo se presenta como error recuperable y no fabrica contenido.

### RF-038 — Presentar tarjetas compactas y veraces

Cada resultado mostrará únicamente información segura y disponible.

**Aceptación:** incluye identificador público, nombre minimizado derivado, bio, experiencia, zona pública, ciudad/departamento, radio, servicio/categoría, descripción, tipo/precio y distancia opcional; el precio usa BOB o “Precio según cotización”; no muestra dirección exacta, coordenadas, estados internos, estrellas ni conteos ficticios.

### RF-039 — Integrar Explore con Home y navegación

La acción “Necesito un servicio” y la pestaña “Explorar” abrirán la ruta real del marketplace.

**Aceptación:** Home, Explorar y Mi perfil son destinos funcionales; no se publican pestañas de solicitudes o mensajes; la navegación protegida existente permanece activa.

### RF-040 — Establecer la transición a perfil público

Cada tarjeta ofrecerá “Ver perfil” con un contrato de ruta basado en `workerId`.

**Aceptación:** MOD-04 crea solo la ruta segura mínima y no consulta ni inventa el perfil público completo; MOD-05 podrá reemplazar su contenido sin cambiar el identificador de navegación.

### RF-041 — Manejar estados recuperables

Explorar comunicará carga, búsqueda fallida, vacío, permiso denegado, catálogo no disponible y fallo de paginación.

**Aceptación:** el vacío dice “No encontramos profesionales con estos filtros.” y ofrece “Limpiar filtros”; los fallos permiten reintentar; un error de página conserva resultados previos; nunca se muestra el mensaje crudo de Supabase.

## 3. Requisitos no funcionales y aceptación

### RNF-021 — Privacidad y mínimo privilegio

La RPC será la única lectura marketplace de datos privados relacionados. **Aceptación:** no se amplían SELECT/RLS de tablas profesionales; salida allowlist sin geometrías, snapshots, notas, estados internos, email, teléfono ni datos administrativos; `anon` no ejecuta la RPC.

### RNF-022 — Seguridad geográfica

PostGIS ejecutará distancia y cobertura. **Aceptación:** usa índice espacial existente cuando corresponde, no calcula coordenadas en el cliente, no devuelve punto exacto ni persiste ubicación del cliente.

### RNF-023 — Rendimiento y paginación

La búsqueda evitará N+1 e infraestructura adicional. **Aceptación:** una RPC resuelve cada página; índices parciales/compuestos y trigramas respaldan elegibilidad/filtros; límite máximo 20; orden total con `worker_id` como desempate.

### RNF-024 — Compatibilidad móvil

La experiencia seguirá Expo SDK 57, Android-first y el sistema UI existente. **Aceptación:** permiso foreground mediante `expo-location`, controles táctiles accesibles, scroll y export web compatibles; funcionalidad y claridad preceden al pulido final.

### RNF-025 — Veracidad de contenido

La UI no presentará señales inexistentes. **Aceptación:** sin reseñas, ratings, estrellas, certificación, disponibilidad “hoy” calculada, popularidad o recomendaciones hasta sus módulos correspondientes.

### RNF-026 — Mantenibilidad y tipado

Tipos, validación, servicio, componentes y pantalla permanecerán separados. **Aceptación:** TypeScript estricto, errores traducidos y lógica consultable fuera de componentes presentacionales; typecheck, lint y Jest deben pasar.

### RNF-027 — Trazabilidad y regresión

MOD-04 conservará la trazabilidad completa. **Aceptación:** `RF-031..041` y `RNF-021..027` enlazan `MOD-04`, `TEST-080..109`, la migración e `IMP-006`; las suites MOD-01/MOD-02/MOD-03 se reejecutan.

## 4. Fuera de alcance

Perfil público completo de MOD-05; solicitudes de servicio, cotizaciones, bookings, reviews, chat, notificaciones, favoritos, certificación, pagos y transacciones cliente-worker; mapa público con marcadores; seguimiento continuo; publicación de portafolio privado; algoritmo de recomendación o reputación.

## 5. Decisiones preservadas como pendientes

- La estrategia definitiva para generar `worker_locations.public_location`; MOD-04 no la rellena ni la devuelve.
- Un radio global predeterminado de búsqueda; sin ubicación no se aplica y con ubicación solo se usa un radio adicional cuando el usuario lo selecciona.
- Reputación, certificación y perfil público completo; no se anticipan sus reglas.

## 6. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-031..RF-041` | `MOD-04` | `TEST-080..TEST-109` | `IMP-006` |
| `RNF-021..RNF-027` | `MOD-04` | `TEST-080..TEST-109` | `IMP-006` |
