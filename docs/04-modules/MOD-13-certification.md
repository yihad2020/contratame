# MOD-13 — Certificación de trabajadores

**Estado:** IMPLEMENTED / AUTOMATED VALIDATION COMPLETE; MANUAL E2E DEFERRED  
**Requisitos:** `RF-122..RF-135`, `RNF-079..RNF-086`  
**Implementación:** `IMP-015`

## Responsabilidades

- Registrar solicitudes históricas en `certification_memberships` sin duplicar el estado en `profiles` o `worker_profiles`.
- Exigir worker aprobado y cuenta activa/confirmada.
- Permitir decisiones admin sobre la solicitud pendiente actual con lock y auditoría atómica.
- Establecer vigencia de 12 meses calendario con tiempo PostgreSQL.
- Derivar badge público desde elegibilidad, estado y fechas actuales.
- Permitir reaplicación tras rechazo o vencimiento, preservando historia.
- Integrar worker mobile, marketplace, perfil público y panel admin.

## Modelo y semántica

Se materializa la entidad congelada con `id`, `worker_id`, `status`, `price_bob`, `starts_at`, `expires_at`, `created_at` y `updated_at`. `pending_payment` representa la solicitud pendiente de verificación manual, `active` la aprobación, `expired` el vencimiento y `cancelled` el rechazo de MOD-13.

No se materializa `payment_transactions`: la instrucción aprobada de este MVP excluye pago electrónico. `price_bob = 50.00` describe la oferta comercial; el admin confirma externamente el proceso manual antes de aprobar.

## Contratos

Worker:

- `get_my_worker_certification_state()`
- `request_worker_certification()`

Público autenticado:

- `get_public_worker_certifications(uuid[])`

Admin:

- `list_admin_certification_requests(text,timestamptz,uuid,integer)`
- `get_admin_certification_request(uuid)`
- `approve_certification_request(uuid)`
- `reject_certification_request(uuid)`

Todos derivan identidad mediante `auth.uid()`, usan `SECURITY DEFINER`, `search_path = ''`, objetos cualificados y grants mínimos. La tabla no admite acceso cliente directo.

## Flujo

1. La app consulta el estado propio.
2. Un worker aprobado solicita; PostgreSQL fija owner, Bs 50, `pending_payment` y timestamps.
3. El admin revisa el contexto seguro y confirma externamente la verificación manual.
4. Aprobar fija `active`, inicio servidor y vencimiento exacto a 12 meses; rechazar fija `cancelled`.
5. La decisión y `audit_logs` ocurren atómicamente.
6. Las consultas públicas muestran badge solo durante vigencia y elegibilidad.
7. Rechazo o vencimiento habilitan otra fila, conservando las anteriores.

## Integración y rendimiento

Marketplace obtiene badges de toda la página en una RPC batch; el perfil público usa el mismo contrato seguro. Los índices cubren worker/historia, pending, active/validez y bandeja administrativa. No se exponen coordenadas, contacto, identidad admin ni historia privada.

## Limitaciones del freeze

`certification_memberships` no contiene notas, evidencia, issuer ni reviewer. Por ello el rechazo no persiste motivo; “Verificación de Contrátame” es texto de UI, no acreditación externa. No se inventan columnas, entidades o buckets.

## Trazabilidad

`RF-122..RF-135` / `RNF-079..RNF-086` → `20261011010000_mod13_certification.sql` → `TEST-450..TEST-499` → `IMP-015`.

