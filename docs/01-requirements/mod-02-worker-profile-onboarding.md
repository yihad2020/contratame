# Contrátame! — Requisitos de MOD-02

## Perfil profesional y onboarding del trabajador

**Módulo:** `MOD-02`  
**Estado:** Aprobado para la primera implementación  
**Implementación:** `IMP-003`

## 1. Reglas aprobadas

- Todo usuario registrado conserva la capacidad de cliente y solo se convierte adicionalmente en trabajador al iniciar explícitamente “Quiero ofrecer mis servicios”.
- El registro normal no crea `worker_profiles`; el inicio del onboarding crea o recupera exactamente uno por `profiles`, inicialmente `draft`.
- El flujo persistente y reanudable tiene seis etapas: perfil profesional, servicios y precios, zona de trabajo, disponibilidad, portafolio y revisión/envío.
- Los estados congelados son `draft`, `pending_approval`, `approved`, `rejected` y `suspended`. MOD-02 no permite autoaprobación.
- Solo `draft` y `rejected` son editables en este módulo. `pending_approval` es de solo lectura; un rechazo corrige el mismo perfil y genera una nueva solicitud histórica al reenviar.
- La visibilidad pública requiere `approved` y no se obtiene por un servicio activo, un archivo de portafolio ni una solicitud pendiente.
- `worker_approval_requests.profile_snapshot` conserva de forma inmutable la información revisada en cada envío.

## 2. Requisitos funcionales y aceptación

### RF-011 — Iniciar o reanudar el perfil profesional

La acción explícita del Home creará o recuperará el perfil profesional del usuario autenticado.

**Aceptación:** crea un único `worker_profiles` con `approval_status = 'draft'` cuando no existe; una restricción `UNIQUE(profile_id)` y una operación idempotente evitan duplicados; no modifica la capacidad de cliente ni MOD-01; un perfil existente se reanuda sin crear otra fila.

### RF-012 — Mantener el perfil profesional básico

El trabajador podrá guardar biografía profesional y años de experiencia.

**Aceptación:** biografía Unicode recortada de 40–600 caracteres; experiencia entera requerida de 0–60, incluyendo cero; no se duplican nombre, apellido, correo, teléfono, foto, profesión, empresa, licencias, documentos, certificados, educación ni redes sociales.

### RF-013 — Gestionar servicios y precios

El trabajador editable podrá crear, consultar, actualizar y eliminar múltiples `worker_services`, cada uno perteneciente a una categoría activa administrada por la plataforma.

**Aceptación:** categoría obligatoria; título recortado de 5–80; descripción recortada de 20–500; `pricing_type` limitado a `hourly`, `daily`, `fixed` o `quote`; BOB positivo con hasta dos decimales para los tres primeros; `price_bob IS NULL` para cotización; nuevos servicios `active = true`; al menos uno activo y válido para enviar.

### RF-014 — Definir una zona privada de trabajo

El trabajador podrá guardar una única base exacta privada y un radio general mediante ubicación actual o selección manual en mapa.

**Aceptación:** `worker_locations` conserva `private_location` PostGIS, `public_area_label`, ciudad, departamento, `country_code = 'BO'` y radio entero de 1–50 km persistido en metros; `public_location` permanece nullable; denegar ubicación no bloquea el mapa; no hay seguimiento continuo, múltiples zonas ni exposición pública de coordenadas exactas.

### RF-015 — Gestionar disponibilidad semanal

El trabajador podrá definir cero o más rangos recurrentes por día mientras está en borrador/corrección.

**Aceptación:** días 0 domingo a 6 sábado; pasos de 30 minutos; inicio anterior a fin; sin cruce de medianoche ni solapamiento el mismo día; un día no disponible no crea filas ficticias; se interpreta con `America/La_Paz`; se requiere al menos un rango válido para enviar.

### RF-016 — Gestionar portafolio opcional

El trabajador podrá mantener de 0 a 12 ejemplos, cada uno con exactamente una imagen.

**Aceptación:** título recortado de 3–80; descripción opcional recortada de hasta 300; `sort_order` se conserva; se aceptan JPEG, PNG y WebP de origen de aproximadamente hasta 10 MB; las imágenes grandes se optimizan a un borde largo aproximado máximo de 1600 px antes de subir; galería funciona aunque cámara sea denegada; eliminar intenta limpiar el objeto asociado.

### RF-017 — Almacenar portafolio de forma privada

Los archivos usarán un bucket privado dedicado y rutas de propiedad `{worker_profile_id}/{portfolio_item_id}/image.<extension>`.

**Aceptación:** la base guarda rutas, no URLs firmadas; el propietario editable administra solo sus objetos; futuros administradores autorizados pueden leer para revisión; borradores y pendientes no son públicos; clientes normales no escriben ni leen activos privados mediante acceso amplio.

### RF-018 — Revisar completitud

La etapa final mostrará el estado de perfil, servicios, zona, disponibilidad y portafolio.

**Aceptación:** portafolio se marca opcional; cada sección requerida incompleta explica el faltante y enlaza a su etapa; no se comunica completitud solo mediante un botón deshabilitado.

### RF-019 — Enviar el perfil atómicamente

Una única operación controlada enviará el perfil a aprobación.

**Aceptación:** identifica al llamador, confirma correo, cuenta `active`, propiedad y estado `draft`/`rejected`; revalida todos los datos obligatorios; evita solicitudes pendientes duplicadas; crea una nueva fila histórica con snapshot; cambia a `pending_approval`; todo ocurre en una transacción y un doble toque no duplica solicitudes.

### RF-020 — Preservar historial de aprobación

Cada envío conservará una instantánea inmutable de perfil, servicios/precios, ubicación/radio, disponibilidad, referencias/metadatos del portafolio y metadata de envío.

**Aceptación:** solicitudes anteriores no se actualizan ni eliminan por trabajadores; rechazo y reenvío usan el mismo `worker_profiles` y producen otra `worker_approval_requests`.

### RF-021 — Aplicar comportamiento por estado

La navegación y edición reflejarán el estado actual del trabajador.

**Aceptación:** `pending_approval`, `approved` y `suspended` muestran experiencia no editable apropiada; `rejected` vuelve a editar el mismo perfil; `pending_approval` bloquea bio, experiencia, servicios, zona, radio, disponibilidad, portafolio y Storage; la edición del perfil general MOD-01 sigue disponible.

### RF-022 — Integrar MOD-02 con Home

La tarjeta profesional consultará el estado real y abrirá onboarding o estado.

**Aceptación:** sin perfil “Quiero ofrecer mis servicios”; `draft` “Continuar mi perfil profesional”; `pending_approval` “Perfil profesional / En revisión”; `approved` “Mi perfil profesional”; `rejected` “Corregir mi perfil”; `suspended` muestra estado no editable; no fabrica capacidades administrativas.

## 3. Requisitos no funcionales y aceptación

### RNF-008 — Autorización y mínimo privilegio

RLS, privilegios por columna, triggers y operaciones controladas protegen datos propios. **Aceptación:** un usuario normal no accede o muta otro onboarding, no cambia `approval_status`, no se autoaprueba, no escribe solicitudes históricas y no elude validación de envío.

### RNF-009 — Privacidad geográfica

La ubicación exacta nunca se expone mediante acceso público directo. **Aceptación:** `worker_locations` carece de lectura pública y cualquier futura consulta pública usa una capa controlada PostGIS que omite `private_location`.

### RNF-010 — Integridad transaccional e histórica

La base es la frontera de integridad. **Aceptación:** envío, snapshot y transición son atómicos; una solicitud pendiente por trabajador; snapshot no nulo e inmutable; mutaciones concurrentes no alteran los datos durante el envío.

### RNF-011 — Seguridad de Storage

El bucket permanece privado y usa rutas verificables por propiedad. **Aceptación:** no existen escrituras públicas; el propietario solo opera bajo su worker id y estado editable; no se persisten URLs firmadas.

### RNF-012 — Compatibilidad móvil y accesibilidad

La experiencia será Android-first, Expo Go compatible y responsive. **Aceptación:** funciona aproximadamente en 360×800, 390×844 y 412×915; protege teclado/safe areas, objetivos táctiles y errores cercanos; la variante web compila sin importar un mapa nativo incompatible.

### RNF-013 — Mantenibilidad y tipado

MOD-02 mantiene rutas, servicios, tipos, validación, estado y pantallas separados, reutilizando UI-01. **Aceptación:** TypeScript estricto, sin archivo gigante ni segundo sistema visual; `tsc`, lint y Jest pasan.

### RNF-014 — Trazabilidad y verificabilidad

Los cambios mantienen trazabilidad completa. **Aceptación:** `RF-011..022` y `RNF-008..014` se relacionan con `MOD-02`, `TEST-026..053`, migración e `IMP-003`; pruebas que requieren Supabase real quedan explícitas.

## 4. Fuera de alcance

Interfaz administrativa de aprobación/rechazo; certificación, cobro de Bs 50 y pagos; marketplace/búsqueda pública; solicitudes, cotizaciones, reservas, chat, reseñas, favoritos, reportes y push; reglas de edición posterior a aprobación; múltiples zonas, agenda instantánea, excepciones/calendarios y video de portafolio.

## 5. Trazabilidad

| Requisitos | Módulo | Pruebas | Implementación |
|---|---|---|---|
| `RF-011..RF-022` | `MOD-02` | `TEST-026..TEST-053` | `IMP-003` |
| `RNF-008..RNF-014` | `MOD-02` | `TEST-026..TEST-053` | `IMP-003` |
