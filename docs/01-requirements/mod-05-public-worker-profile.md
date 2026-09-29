# Contrátame! — Requisitos de MOD-05: perfil público del trabajador

**Módulo:** `MOD-05 — Perfil público del trabajador`  
**Implementación:** `IMP-007`  
**Pruebas:** `TEST-110..TEST-139`  
**Estado:** Implementado y validado automáticamente; verificación Android real diferida

## 1. Objetivo

Permitir que un cliente autenticado abra desde Explorar el perfil público vigente de un profesional elegible, con identidad minimizada, información profesional, zona pública, servicios, disponibilidad y portafolio, sin ampliar todavía el flujo hacia solicitudes, contacto, reseñas o certificación.

## 2. Requisitos funcionales

### RF-042 — Consultar un perfil profesional público elegible

La aplicación deberá consultar un worker por `worker_id` mediante una operación controlada que vuelva a comprobar, independientemente de la búsqueda, que la cuenta general está `active`, el worker está `approved`, existe ubicación profesional y existe al menos un servicio activo en una categoría activa.

**Criterios de aceptación:**

- Una cuenta autenticada, confirmada y `active` obtiene una única fila para un worker elegible.
- Workers `draft`, `pending_approval`, `rejected` o `suspended`, cuentas no activas y workers sin servicio/categoría activa no producen perfil público.
- Un UUID existente o inexistente no elegible devuelve el mismo estado no disponible, sin explicar la causa interna.
- La elegibilidad se revalida al abrir el detalle y no se confía en el resultado anterior de MOD-04.

### RF-043 — Mostrar identidad, experiencia y zona pública seguras

El perfil deberá mostrar nombre público minimizado, biografía, años de experiencia, `public_area_label`, ciudad, departamento y radio de servicio.

**Criterios de aceptación:**

- El nombre usa nombre y solo inicial del apellido, de forma consistente con MOD-04.
- La zona se compone únicamente de etiquetas administrativas aprobadas y radio.
- No se devuelven ni presentan `private_location`, `public_location`, coordenadas, `profile_id`, identificadores Auth, email o teléfono.
- Los datos opcionales ausentes se presentan con texto honesto y no con valores inventados.

### RF-044 — Mostrar servicios públicos activos

El perfil deberá mostrar todos los servicios activos del worker que pertenezcan a categorías activas, con categoría, título, descripción, tipo de precio y precio cuando corresponda.

**Criterios de aceptación:**

- Servicios inactivos y servicios de categorías inactivas quedan excluidos en base de datos.
- Los servicios tienen orden determinístico por categoría, título e identificador.
- `quote` se presenta como cotización y nunca como Bs 0.
- No se crean categorías, precios o textos ficticios en el cliente.

### RF-045 — Mostrar disponibilidad semanal activa

El perfil deberá mostrar los bloques recurrentes activos de `worker_availability` por día y rango horario.

**Criterios de aceptación:**

- Solo se devuelven filas `active`.
- Los rangos se ordenan por día, hora de inicio y hora de fin.
- Si no existen rangos activos, la interfaz informa que no se publicaron horarios; no infiere disponibilidad actual.

### RF-046 — Mostrar portafolio mediante acceso temporal

El perfil deberá presentar metadata ordenada de `worker_portfolio_items` e imágenes del bucket privado `worker-portfolio` mediante URLs firmadas de corta duración.

**Criterios de aceptación:**

- El bucket permanece privado y no se generan URLs públicas permanentes.
- La operación de perfil devuelve metadata/ruta de los ítems en orden `sort_order`, sin una URL persistida.
- El móvil solicita las URLs de todos los ítems en una sola operación batch con vigencia de 300 segundos.
- Un cliente solo puede firmar un objeto registrado de un worker que continúe elegible.
- Un fallo total o parcial al firmar/renderizar imágenes no oculta el resto del perfil y muestra un fallback seguro.
- Se preserva la lectura existente del propietario y del administrador sin ampliar sus permisos de escritura.

### RF-047 — Navegar y presentar el detalle móvil

La ruta protegida `/(app)/worker/[workerId]` deberá presentar el perfil real siguiendo el sistema visual azul/verde y la jerarquía útil de `screen_ideas/perfil_profesional.png`.

**Criterios de aceptación:**

- Una tarjeta principal presenta identidad, zona, radio, biografía y experiencia.
- Secciones separadas presentan servicios, disponibilidad y portafolio.
- Existen estados visibles de carga, perfil no disponible y error con reintento.
- La navegación permite volver y conserva Explorar como destino activo.
- No aparecen botones inertes de solicitar servicio, mensaje, favorito, reseña o certificación.

### RF-048 — Rechazar identificadores de ruta inválidos

La ruta deberá validar localmente el parámetro antes de ejecutar la RPC.

**Criterios de aceptación:**

- Solo se acepta un string con UUID canónico.
- Un valor ausente, múltiple o malformado muestra el estado no disponible.
- Para un parámetro inválido no se llama a Supabase ni a Storage.

## 3. Requisitos no funcionales

### RNF-028 — Privacidad y autorización cerrada

**Criterios de aceptación:**

- La RPC es `SECURITY DEFINER`, fija `search_path = ''`, califica objetos y tiene allowlist explícita.
- Solo `authenticated` puede ejecutarla; `anon` no recibe `EXECUTE`.
- La RPC exige correo confirmado y `profiles.account_status = 'active'` mediante la frontera MOD-01.
- No se concede SELECT público amplio sobre tablas profesionales ni se debilitan las políticas owner/admin.

### RNF-029 — Mínimo privilegio en Storage

**Criterios de aceptación:**

- La política adicional se limita a `SELECT`, al bucket `worker-portfolio`, a objetos registrados y a workers actualmente elegibles.
- Un objeto no registrado, un prefijo ajeno o un worker que deja de ser elegible no puede firmarse por un cliente normal.
- No se exponen credenciales privilegiadas ni se usa `service_role` en Expo.

### RNF-030 — Eficiencia y consistencia del contrato

**Criterios de aceptación:**

- El detalle se resuelve con una RPC que retorna una fila y arreglos JSON ordenados, sin consultas por servicio, horario o ítem.
- Storage usa una sola solicitud batch para todas las URLs firmadas.
- La respuesta refleja el estado actual de la base de datos y no depende de snapshots de aprobación.

### RNF-031 — Compatibilidad y mantenibilidad móvil

**Criterios de aceptación:**

- Se conservan Expo SDK 57, Expo Router, TypeScript estricto y los componentes/tokens existentes.
- La lógica de contrato, normalización y acceso queda fuera de la pantalla presentacional.
- No se agrega una dependencia para implementar MOD-05.

### RNF-032 — Pruebas, regresión y trazabilidad

**Criterios de aceptación:**

- `RF-042..RF-048`, `RNF-028..RNF-032`, `MOD-05`, `TEST-110..TEST-139` e `IMP-007` mantienen referencias consistentes.
- pgTAP cubre contrato, elegibilidad, allowlist, privacidad y Storage.
- Jest cubre UUID, normalización, formato y degradación de URLs firmadas.
- Las suites y contratos MOD-01 a MOD-04 permanecen aprobados.

## 4. Fuera de alcance y pendientes preservados

MOD-05 no implementa solicitudes, cotizaciones, bookings, contacto, mensajería, favoritos, reseñas, calificaciones, certificación, pagos, avatar público ni distancia al cliente. Tampoco define la estrategia pendiente para generar `public_location`; esa geometría no se devuelve ni se usa en este detalle. Las reglas pendientes de los módulos futuros permanecen sin asumir.
