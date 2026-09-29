# MOD-05 — Perfil público del trabajador

**Estado:** Implementado y validado automáticamente; verificación Android real diferida  
**Requisitos:** `RF-042..RF-048`, `RNF-028..RNF-032`  
**Pruebas:** `TEST-110..TEST-139`  
**Registro:** `IMP-007`

## 1. Objetivo y responsabilidades

MOD-05 transforma la ruta de transición creada por MOD-04 en un detalle público real para clientes autenticados. Publica únicamente identidad minimizada, perfil profesional, zona administrativa, radio, servicios activos, disponibilidad activa y metadata/imagenes temporales del portafolio.

## 2. Frontera de datos

```text
cliente confirmado + active
        │
        ▼
get_public_worker_profile(worker_id)
        │
        ├── profiles active
        ├── worker_profiles approved
        ├── worker_locations existente (solo etiquetas/radio)
        ├── worker_services active + service_categories active
        ├── worker_availability active
        └── worker_portfolio_items (metadata/ruta)
                    │
                    ▼
     createSignedUrls(paths, 300 s) sobre bucket privado
```

La RPC retorna una fila con tres arreglos JSON ordenados y no concede lectura directa adicional sobre las tablas. Repite la elegibilidad aunque el usuario llegue desde un resultado anterior de Explorar.

## 3. Contrato público

Campos escalares: `worker_id`, `display_name`, `professional_bio`, `years_experience`, `public_area_label`, `city`, `department` y `service_radius_m`.

Arreglos:

- `services`: identificadores de servicio/categoría, categoría, título, descripción y precio aprobado.
- `availability`: día, inicio y fin de rangos activos.
- `portfolio`: identificador, ruta privada, título, descripción y orden. La ruta permite la firma controlada, pero no concede acceso por sí misma ni es una URL pública.

Se omiten contactos, `profile_id`, Auth, coordenadas/geometrías, estados internos, snapshots, notas administrativas, certificación y reseñas.

## 4. Storage

`worker-portfolio` permanece privado. La política `worker_portfolio_objects_select_public_eligible` usa un guard `SECURITY DEFINER` de resultado booleano para comprobar cuenta solicitante activa/confirmada, objeto registrado, cuenta del worker activa, estado `approved`, ubicación existente y servicio/categoría activos. La política es aditiva: propietario y administrador conservan su lectura previa; no cambia escritura.

El móvil usa `createSignedUrls` una vez para todo el arreglo, con TTL de cinco minutos. Errores por ítem o por lote dejan visible la metadata y una representación neutral.

## 5. Experiencia móvil

- Ruta protegida `/(app)/worker/[workerId]`.
- Validación UUID antes de cualquier acceso remoto.
- Cabecera y navegación existentes, con Explorar activo y regreso.
- Tarjeta de identidad y secciones de servicios, disponibilidad y portafolio.
- Carga, no disponible, error/reintento y fallback de imágenes.
- Sin CTA de solicitud/contacto hasta que exista el módulo correspondiente.

La referencia `screen_ideas/perfil_profesional.png` se usa para jerarquía y densidad, no para copiar certificación, estrellas, reseñas, mensajes o datos ficticios.

## 6. Seguridad

- RPC y guard Storage con `SECURITY DEFINER`, `search_path = ''` y objetos calificados.
- `EXECUTE` de la RPC solo para `authenticated`; acceso anónimo denegado.
- Cuenta solicitante confirmada/activa verificada en base de datos.
- Elegibilidad del target verificada en cada llamada y en cada firma de objeto.
- Sin SELECT público amplio ni cambios a RLS de ubicación/worker/servicios.
- Sin `service_role`, secretos, bucket público o URLs permanentes.

## 7. Fuera de alcance

Solicitudes, cotizaciones, bookings, reviews, ratings, favoritos, chat, notificaciones, certificación, pagos, contacto, avatar público, distancia y generación de `public_location`. MOD-05 no modifica entidades, cardinalidades, columnas, estados ni reglas congeladas.

## 8. Validación

El reset local aplicó MOD-01 a MOD-05 y pgTAP aprobó **5 archivos / 263 aserciones**, incluidas **50/50** de MOD-05. También aprobaron TypeScript, ESLint, Jest (**7 suites / 66 pruebas**), Expo Doctor (**21/21**), alineación de dependencias, export web, lint local de `public`/`private` y `git diff --check`. El dry-run vinculado listó únicamente `20260929010000_mod05_public_worker_profile.sql` y no aplicó cambios. La comprobación Android real permanece diferida.
