# IMP-008 — Primera implementación de MOD-06

**Fecha:** 2026-09-29  
**Módulo:** `MOD-06 — Solicitudes directas de servicio`  
**Requisitos:** `RF-049..RF-057`, `RNF-033..RNF-038`  
**Pruebas:** `TEST-140..TEST-179`  
**Estado:** Implementado; validación local automatizada aprobada, dry-run vinculado bloqueado y Android real diferido

## Cambios

- Migración `20260929020000_mod06_service_requests.sql` que materializa las entidades congeladas `service_requests`, `service_request_locations`, `conversations` y `notifications`.
- RPC atómica de creación con caller derivado, elegibilidad revalidada, PostGIS privado, conversación y notificación.
- RPC paginada por perspectiva y RPC de detalle participante con coordenadas/dirección solo para el cliente.
- Grants mínimos, RLS defensiva, constraints, índices congelados y triggers `updated_at`.
- CTA real en el perfil público, ruta de formulario/revisión/éxito y ubicación actual o mapa manual.
- `Solicitudes` real en navegación, con vista cliente/worker, paginación y detalle seguro.
- Suite pgTAP MOD-06 de 68 aserciones y suite Jest de lógica pura.
- Documentación `RF/RNF → MOD-06 → TEST → IMP-008` e índices actualizados.

## Seguridad y privacidad

- Sin `customer_profile_id` o status controlados por móvil, sin mutaciones directas y sin `service_role`.
- Worker/servicio/categoría/cuenta se revalidan en PostgreSQL al crear.
- Exact location permanece separada; solo el cliente la recibe. El worker obtiene zona general antes de booking.
- Lista y contratos públicos carecen de ubicación exacta.
- Conversación/notificación se crean como acompañantes, sin anticipar chat, mensajes, push o UI de notificaciones.
- No se añadió bypass administrativo general o de ubicación exacta no aprobado.

## Decisiones preservadas

No se implementan cotizaciones, bookings, reviews, chat, cancelación, favoritos, certificación ni pagos. `expires_at` permanece nulo. La auto-contratación no está prohibida en la documentación congelada, por lo que no se inventó una restricción.

## Validación

| Control | Resultado |
|---|---|
| Reset local Supabase CLI `2.118.0` | Aprobado; aplicó MOD-01 a MOD-06. |
| pgTAP completo | Aprobado: **6 archivos / 331 aserciones**; MOD-06 ejecutó **68/68**. |
| TypeScript | Aprobado. |
| ESLint | Aprobado. |
| Jest | Aprobado: **8 suites / 82 pruebas**, sin snapshots. |
| Expo Doctor | Aprobado: **21/21**. |
| Dependencias Expo | Alineadas; no se agregó dependencia. |
| Export web | Aprobado. |
| `git diff --check` | Aprobado; avisos LF/CRLF únicamente informativos. |
| Dry-run vinculado | Bloqueado antes de ejecución: el entorno rechazó contactar el proyecto vinculado por destino externo no verificado. |

No se ejecutó `db push`, commit ni push. La migración no fue desplegada remotamente. La integración real con Supabase de desarrollo y la comprobación Android de `TEST-178` permanecen diferidas y no se presentan como aprobadas.
