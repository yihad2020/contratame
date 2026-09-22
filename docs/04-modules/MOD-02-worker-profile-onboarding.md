# MOD-02 — Perfil profesional y onboarding del trabajador

**Estado:** Completo y validado  
**Requisitos:** `RF-011..RF-022`, `RNF-008..RNF-014`  
**Pruebas:** `TEST-026..TEST-053`  
**Registro:** `IMP-003`

## 1. Objetivo y responsabilidades

MOD-02 agrega la capacidad profesional sin reemplazar la capacidad de cliente. Implementa inicio explícito, borrador persistente en seis etapas, servicios, ubicación privada PostGIS, disponibilidad recurrente, portafolio privado, revisión y envío atómico a aprobación.

No aprueba trabajadores ni crea visibilidad pública. MOD-01 sigue siendo autoritativo para Auth, correo confirmado, `profiles` y `account_status`.

## 2. Modelo de datos congelado utilizado

```text
profiles 1 ── 0..1 worker_profiles
worker_profiles 1 ── 0..1 worker_locations
worker_profiles 1 ── N worker_services ── 1 service_categories
worker_profiles 1 ── N worker_availability
worker_profiles 1 ── N worker_portfolio_items
worker_profiles 1 ── N worker_approval_requests
```

Se conservan exactamente las entidades y columnas de `docs/03-database/logical-schema-v1.md`. `profile_snapshot jsonb` representa el envío inmutable sin alterar el modelo congelado.

## 3. Estados y navegación

```text
sin perfil ── iniciar ──► draft ── enviar ──► pending_approval
                             ▲                       │
                             └──── mismo perfil ◄── rejected

pending_approval ── futuro admin ──► approved | rejected
approved ── futuro admin ──► suspended
```

`draft` y `rejected` son editables. Los otros estados presentan información de estado sin controles de onboarding. La tarjeta Home resuelve el texto y destino desde el estado real.

## 4. Flujo móvil

1. Perfil profesional: bio y experiencia.
2. Servicios y precios: CRUD de servicios por categoría.
3. Zona de trabajo: ubicación actual o mapa, etiqueta/categoría administrativa y radio.
4. Disponibilidad: rangos semanales de 30 minutos sin solapamiento.
5. Portafolio: hasta 12 imágenes privadas opcionales.
6. Revisar y enviar: completitud explicada y RPC atómica.

Cada etapa guarda datos válidos antes de avanzar y permite volver. El contexto del módulo recarga el borrador desde Supabase; no depende de memoria local como fuente canónica.

## 5. Operaciones y seguridad

- `start_or_resume_worker_onboarding()` crea idempotentemente o devuelve el worker propio.
- `submit_worker_profile_for_approval()` bloquea el worker, revalida Auth/cuenta/propiedad/contenido, crea snapshot e historial y cambia el estado en una transacción.
- RLS limita tablas privadas al propietario confirmado y activo; las mutaciones exigen estado editable.
- El cliente carece de permiso para insertar/borrar workers, escribir historial o actualizar `approval_status`.
- Triggers serializan mutaciones hijas con el worker y rechazan datos inválidos, disponibilidad superpuesta, más de 12 portfolios y cambios pendientes.
- `worker_locations` no tiene acceso anónimo/público.
- El bucket privado `worker-portfolio` verifica el primer segmento de la ruta contra el worker propietario; futuros administradores solo reciben lectura para revisión.
- Funciones privilegiadas usan `SECURITY DEFINER`, `search_path = ''`, objetos calificados, grants mínimos y `auth.uid()`; nunca aceptan un user id como autoridad.

## 6. Snapshot de aprobación

`worker_approval_requests.profile_snapshot` contiene una versión identificada, fecha/actor, perfil profesional, servicios y precios, ubicación/radio (incluida la base exacta únicamente dentro del historial privado), disponibilidad y metadata/rutas privadas del portafolio. Las filas históricas no tienen permisos de update/delete para trabajadores.

## 7. Storage e imágenes

- Bucket: `worker-portfolio`, privado.
- Ruta: `{worker_profile_id}/{portfolio_item_id}/image.<extension>`.
- Origen: JPEG/PNG/WebP, aproximadamente ≤10 MB.
- Optimización móvil: borde largo aproximado ≤1600 px antes de upload.
- La aplicación guarda solo `storage_path` y solicita objetos con autorización; no persiste URLs firmadas.

## 8. Fuera de alcance

Administración/aprobación, publicación y búsqueda, certificación/pagos y los demás módulos de marketplace. La lectura pública futura deberá usar vistas/RPC seguras; no se habilita `SELECT` público sobre tablas privadas.
