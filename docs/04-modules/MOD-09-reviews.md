# MOD-09 — Reseñas

**Estado:** Implementado; validación automatizada local aprobada, Android/Supabase real diferidos  
**Requisitos:** `RF-076..RF-084`, `RNF-049..RNF-054`  
**Pruebas:** `TEST-260..TEST-299`  
**Registro:** `IMP-011`

## 1. Objetivo

Agregar el cierre reputacional del flujo ya completado: el cliente califica una vez al worker, el booking conserva la relación autoritativa y los perfiles públicos elegibles muestran reputación real.

## 2. Modelo y contratos

`reviews` materializa exactamente la entidad congelada y mantiene `bookings 1 : 0..1 reviews`. `create_booking_review(uuid,smallint,text)` bloquea y valida el booking, deriva participantes, inserta review y notifica atómicamente. `get_my_booking_review(uuid)` devuelve la allowlist a participantes. `get_public_worker_reputation(uuid,offset,limit)` repite elegibilidad MOD-05 y devuelve promedio, conteo y una página ordenada de reseñas.

## 3. Contenido e inmutabilidad

Rating usa 1–5. El comentario opcional colapsa espacios y vacío se convierte en `NULL`; no existe límite congelado. No hay edición/eliminación: grants, ausencia de RPC y trigger protegen la reseña. Una futura moderación necesitará una decisión explícita.

## 4. Experiencia móvil

- Booking completado de cliente sin review: CTA “Calificar servicio”.
- Worker: nunca ve CTA de creación.
- Formulario: contexto real, selector accesible 1–5, comentario opcional, estados de envío/error/éxito.
- Review existente: tarjeta read-only para ambos participantes.
- Perfil público: promedio/conteo, diez reseñas recientes o “No hay reseñas todavía.”

## 5. Seguridad y privacidad

No se aceptan actor, worker ni estado desde Expo. No hay DML directo. La salida pública omite reviewer, contacto, booking/request/quote, descripción y ubicación exacta. Un worker no elegible no obtiene perfil ni reputación pública.

## 6. Notificación

La creación agrega `review_received` al propietario del worker, persistida en `notifications`; no se implementa push ni bandeja nueva. El fallo revierte toda la operación.

## 7. Marketplace

MOD-09 no cambia el ranking ni reemplaza el contrato `search_marketplace_workers`. La reputación real queda integrada en el perfil público; mostrar agregados en tarjetas de Explorar se difiere para una evolución explícita del contrato MOD-04, sin N+1.

## 8. Fuera de alcance

Edición/eliminación, respuestas, fotos, múltiples categorías, votos útiles, anonimato configurable, moderación compleja, chat, push, favoritos, certificación, pagos y recomendaciones.

## 9. Estado de validación

La migración se aplicó mediante reset local junto con MOD-01..08. Las nueve suites pgTAP aprobaron **537 aserciones** y MOD-09 aprobó **60/60**. TypeScript, ESLint, Jest (**11 suites / 130 pruebas**), Expo Doctor (**21/21**), verificación de dependencias Expo, export web, lint de esquemas y `git diff --check` aprobaron.

El dry-run del proyecto vinculado lista únicamente `20261001020000_mod09_reviews.sql` y no realizó cambios remotos. La verificación manual Android/Supabase real permanece diferida.
