# MOD-13 — Requisitos de certificación de trabajadores

**Estado:** IMPLEMENTED / AUTOMATED VALIDATION COMPLETE  
**Trazabilidad:** `RF-122..RF-135`, `RNF-079..RNF-086` → `MOD-13` → `TEST-450..TEST-499` → `IMP-015`

## Alcance aprobado

MOD-13 materializa únicamente la entidad congelada `certification_memberships`. La certificación es opcional, separada de la aprobación profesional, administrada internamente por Contrátame, cuesta Bs 50 y dura 12 meses calendario desde su aprobación administrativa.

El cobro y su verificación son externos/manuales para el MVP. No se materializa `payment_transactions`, no existe pasarela, QR, tarjeta, reembolso automatizado ni ledger. La acción administrativa de aprobación presupone que la verificación manual externa ya ocurrió.

Los estados congelados se interpretan así en MOD-13:

- `pending_payment`: solicitud pendiente de verificación administrativa manual;
- `active`: solicitud aprobada y dentro de su vigencia;
- `expired`: vigencia concluida;
- `cancelled`: solicitud rechazada en este alcance.

El freeze no contiene notas de revisión ni evidencia documental. Por tanto, MOD-13 no almacena motivo de rechazo, archivos, proveedor externo ni identidad administrativa en contratos públicos o del trabajador.

## Requisitos funcionales

### RF-122 — Consultar estado propio

Una cuenta activa y confirmada puede consultar el estado de certificación de su propio perfil profesional. **CA:** la identidad se deriva de `auth.uid()` y el resultado normaliza `not_eligible`, `eligible`, `pending`, `active`, `rejected` o `expired` sin exponer al administrador.

### RF-123 — Elegibilidad para solicitar

Solo el propietario de un worker `approved`, con cuenta activa y correo confirmado, puede solicitar certificación. **CA:** draft, pending, rejected, suspended, deactivated, no confirmado, anónimo y terceros fallan en PostgreSQL.

### RF-124 — Solicitud y precio

La RPC crea una nueva membresía `pending_payment` con precio servidor de Bs 50 y fechas de vigencia nulas. **CA:** el cliente no suministra owner, estado, precio ni timestamps y no se crea pago electrónico.

### RF-125 — Unicidad y conservación histórica

Un worker no puede tener otra solicitud pendiente ni otra certificación vigente. **CA:** índices y RPC bloquean duplicados; las decisiones anteriores nunca se sobrescriben.

### RF-126 — Bandeja administrativa

El admin autorizado lista y abre solicitudes con los cuatro estados congelados, cursor determinista y contexto seguro del worker. **CA:** un no-admin no ejecuta los contratos; no se expone contacto ni ubicación privada.

### RF-127 — Aprobación administrativa

Solo un admin puede aprobar una solicitud `pending_payment` cuyo worker continúa elegible. **CA:** PostgreSQL deriva actor y hora, activa la membresía y fija `expires_at = starts_at + interval '12 months'` atómicamente.

### RF-128 — Rechazo administrativo

Solo un admin puede rechazar una solicitud pendiente, representándola con el estado congelado `cancelled`. **CA:** fechas permanecen nulas, la decisión es terminal y no se inventa un campo de motivo.

### RF-129 — Vigencia pública derivada

El badge existe únicamente si la cuenta es elegible, el worker permanece `approved`, la membresía está `active` y el tiempo servidor se encuentra entre inicio y vencimiento. **CA:** pending, cancelled, expired y pérdida de elegibilidad no producen badge.

### RF-130 — Vencimiento sin cron obligatorio

Las consultas públicas derivan vigencia por fecha. **CA:** un registro vencido deja de mostrar badge aun antes de persistir `expired`; la próxima reaplicación normaliza el estado histórico.

### RF-131 — Reaplicación

El worker puede volver a solicitar inmediatamente después de rechazo o vencimiento. **CA:** se agrega una nueva fila y se preserva la historia; no existe cooldown.

### RF-132 — Integración pública eficiente

Marketplace y perfil público muestran un badge sobrio “Verificado” únicamente desde un contrato backend seguro. **CA:** una consulta batch cubre los workers de la página y no existe booleano canónico almacenado ni N+1.

### RF-133 — Experiencia móvil

La app muestra explicación, precio, vigencia y estados reales, con acción solo cuando `can_request` lo permite. **CA:** no afirma garantía de calidad, pago electrónico ni acreditación externa.

### RF-134 — Auditoría administrativa

Aprobar o rechazar agrega un evento append-only a `audit_logs` en la misma transacción. **CA:** actor, entidad, transición, vigencia y timestamp se derivan en servidor; un fallo no deja decisión parcial.

### RF-135 — Exclusiones explícitas

MOD-13 no implementa pagos, reembolsos, adjuntos, organizaciones certificadoras, sanciones automáticas, push ni cancelación de certificaciones activas. **CA:** no aparecen entidades, buckets, columnas o flujos fuera del freeze.

## Requisitos no funcionales

### RNF-079 — Autorización en base de datos

RLS, grants mínimos y RPCs `SECURITY DEFINER` con `search_path = ''` protegen toda operación. **CA:** no existe DML cliente directo y `service_role` no aparece en mobile/admin.

### RNF-080 — Integridad transaccional

Constraints, índices parciales, row locks y revalidación post-lock mantienen estados, unicidad, vigencia y auditoría. **CA:** decisiones stale o concurrentes fallan cerradas.

### RNF-081 — Privacidad y minimización

Los contratos worker, público y admin usan allowlists apropiadas. **CA:** el público recibe solo worker, booleano derivado y vencimiento; nunca contacto, ubicación, actor o historia privada.

### RNF-082 — Rendimiento acotado

Las consultas usan índices, límites 1–50, cursores `(created_at,id)` y batch público. **CA:** el marketplace no realiza una consulta de certificación por card.

### RNF-083 — Tiempo confiable

Inicio, vencimiento, actualización y auditoría usan tiempo PostgreSQL. **CA:** ningún cliente puede suministrar fechas y la vigencia representa 12 meses calendario exactos.

### RNF-084 — Tipado y UX

Mobile/admin mantienen TypeScript estricto, estados loading/error/empty y acciones explícitas. **CA:** las pruebas unitarias cubren mapeo, etiquetas, badge, precio, errores y terminalidad.

### RNF-085 — Regresión

MOD-13 preserva MOD-01..12. **CA:** reset, pgTAP completo, lint de esquema, Jest/Vitest, TypeScript, ESLint, Expo y builds deben aprobar antes del cierre.

### RNF-086 — Trazabilidad

Requisitos, módulo, migración, pruebas e `IMP-015` permanecen enlazados. **CA:** verificaciones manuales no ejecutadas se declaran diferidas y no se inventa un PASS.

## Pendientes que permanecen fuera del módulo

Proveedor y conciliación electrónica de pagos, reembolsos, evidencia documental, retención, cancelación de una certificación activa y acreditación externa. La ausencia de campo de notas impide persistir un motivo de rechazo; cualquier cambio futuro requiere decisión y migración separadas.

