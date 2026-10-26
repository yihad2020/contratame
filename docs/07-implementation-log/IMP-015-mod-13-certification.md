# IMP-015 — MOD-13 Certificación de trabajadores

**Estado:** COMPLETE / AUTOMATED VALIDATED; MANUAL E2E DEFERRED  
**Fecha:** 2026-10-24  
**Rama:** `feature/MOD-13-certification`

## Trazabilidad

`RF-122..RF-135`, `RNF-079..RNF-086` → `MOD-13` → migración `20261011010000_mod13_certification.sql` → `TEST-450..TEST-499` → `IMP-015`.

## Implementación

- Materializada únicamente `certification_memberships` con los ocho campos congelados.
- Precio servidor Bs 50, vigencia servidor de 12 meses calendario y estados frozen.
- RPC owner-only para estado y solicitud, sin parámetros de identidad/estado/fecha.
- RPC pública batch derivada para marketplace y perfil público.
- Bandeja/detalle y decisiones admin reutilizando Supabase Auth y `user_roles`.
- Locks, revalidación, índices parciales y auditoría atómica para decisiones.
- Mobile con estados not eligible/eligible/pending/active/rejected/expired.
- Badge “Verificado” sobrio, derivado desde backend y condicionado a elegibilidad actual.
- Unit tests mobile/admin y 84 aserciones pgTAP específicas.

## Decisiones y limitaciones aplicadas

- `pending_payment` representa solicitud pendiente de verificación manual; no es un pago electrónico.
- `cancelled` representa rechazo porque el freeze no define `rejected` para la entidad.
- No se materializa `payment_transactions`, conforme al alcance aprobado sin pagos.
- No existe motivo de rechazo porque el freeze no contiene un campo compatible.
- No existen evidencia/documentos, bucket, issuer externo, reembolso, sanción ni push.
- “Verificación de Contrátame” no se presenta como garantía ni acreditación externa.

## Validación

- Reset local MOD-01..13: PASS.
- pgTAP: 13 archivos / 886 aserciones; MOD-13 84/84, PASS.
- Lint `public,private`: `No schema errors found`.
- Mobile: TypeScript, ESLint, 17 suites/178 Jest, Expo Doctor 21/21, dependencias y export web, PASS.
- Admin: TypeScript, ESLint, 3 archivos/10 Vitest y build Next.js, PASS.
- `git diff --check`: PASS.
- `db push --dry-run`: listó solo `20261011010000_mod13_certification.sql`; no hubo despliegue.
- Android real e integración funcional contra Supabase vinculado: diferidos, no marcados PASS.

