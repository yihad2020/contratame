# IMP-011 — Primera implementación de MOD-09

**Fecha:** 2026-10-01  
**Módulo:** `MOD-09 — Reseñas`  
**Requisitos:** `RF-076..RF-084`, `RNF-049..RNF-054`  
**Pruebas:** `TEST-260..TEST-299`  
**Estado:** Implementado; validación automatizada local aprobada, Android/Supabase real diferidos

## Cambios

- Migración `20261001020000_mod09_reviews.sql` con la entidad congelada `reviews`.
- RPC de creación, lectura participante y reputación pública paginada.
- Unicidad por booking, rating 1–5, lock, inmutabilidad, grants mínimos y RLS.
- Notificación persistente `review_received` dentro de la transacción.
- Módulo móvil de tipos, lógica, errores, servicios, formulario accesible y tarjetas read-only.
- CTA real desde booking completado y sección de reseñas reales en perfil público.
- pgTAP y Jest para seguridad, integridad, privacidad y lógica pura.

## Decisiones preservadas

No se inventaron límites de comentario, identidad pública del reviewer, edición/eliminación, moderación, fotos, respuestas, push, ranking o recomendación. El marketplace no realiza consultas N+1 ni cambia su contrato/ranking.

## Validación

| Control | Resultado |
|---|---|
| Reset local Supabase | Aprobado; aplicó MOD-01 a MOD-09, incluida `20261001020000_mod09_reviews.sql`. |
| pgTAP | Aprobado: **9 archivos / 537 aserciones**; MOD-09 **60/60**. |
| Lint de esquema | Aprobado para `public,private`; sin errores. |
| TypeScript `npx tsc --noEmit` | Aprobado. |
| ESLint `npm run lint` | Aprobado. |
| Jest `npm test -- --runInBand` | Aprobado: **11 suites / 130 pruebas**, sin snapshots. |
| Expo Doctor | Aprobado: **21/21**. |
| Dependencias Expo | Alineadas. |
| Export web | Aprobado. |
| `git diff --check` | Aprobado. |
| Dry-run vinculado | Aprobado; aplicaría únicamente `20261001020000_mod09_reviews.sql`. No se aplicó remotamente. |
| Supabase real / Android | No ejecutado; diferido. |

La corrección final de pgTAP fue exclusivamente de la prueba: los literales de rating se tiparon como `smallint`, la constraint se comprobó estructuralmente por nombre y las identidades de fixture se ejecutaron bajo los roles/JWT previstos. No se modificó SQL productivo para hacer pasar la suite.

No se ejecutó despliegue remoto, commit ni push.
