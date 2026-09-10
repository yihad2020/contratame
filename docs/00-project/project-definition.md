# Contrátame! — Definición del Proyecto

## 1. Información general

**Nombre del proyecto:** Contrátame!

**Tipo de proyecto:** Proyecto de Grado — Ingeniería de Software

**Tipo de producto:** Plataforma digital de contratación de servicios independientes.

**Plataforma inicial:** Aplicación móvil Android.

**Mercado inicial:** Bolivia.

**Área geográfica inicial:** Santa Cruz de la Sierra.

**Duración estimada de desarrollo académico:** 6 meses.

---

## 2. Descripción

Contrátame! es una plataforma móvil orientada a conectar personas que necesitan contratar servicios con trabajadores independientes que ofrecen oficios y servicios profesionales de carácter principalmente manual.

La plataforma permitirá que trabajadores independientes creen perfiles profesionales, publiquen los servicios que ofrecen, definan tarifas, disponibilidad y zona de trabajo, y reciban solicitudes de potenciales clientes.

Por otro lado, los clientes podrán buscar profesionales según el tipo de servicio requerido, ubicación, disponibilidad, precio, experiencia y reputación.

El objetivo es centralizar y digitalizar un proceso que actualmente en Bolivia depende en gran medida de recomendaciones personales, contactos informales, grupos de WhatsApp, Facebook y otros medios no especializados.

---

## 3. Problema identificado

En Bolivia, una gran cantidad de trabajadores independientes obtiene clientes principalmente mediante recomendaciones personales, contactos, redes sociales y grupos informales.

Este modelo presenta diferentes dificultades.

Para los trabajadores:

- Baja visibilidad fuera de su círculo de contactos.
- Dificultad para construir una reputación digital verificable.
- Falta de herramientas para mostrar experiencia y trabajos realizados.
- Dependencia de recomendaciones informales.
- Dificultad para organizar solicitudes y disponibilidad.

Para los clientes:

- Dificultad para encontrar profesionales disponibles.
- Falta de información previa sobre experiencia y calidad del trabajador.
- Poca transparencia sobre precios.
- Dificultad para comparar diferentes profesionales.
- Ausencia de reputación centralizada.
- Incertidumbre sobre la confiabilidad de la persona contratada.

---

## 4. Propuesta de solución

Desarrollar una plataforma móvil que permita conectar clientes con trabajadores independientes de manera estructurada, geolocalizada y confiable.

Los trabajadores podrán crear un perfil profesional que incluya información como:

- Datos personales.
- Fotografía de perfil.
- Descripción profesional.
- Experiencia.
- Servicios ofrecidos.
- Tarifas.
- Disponibilidad.
- Zona de trabajo.
- Portafolio de trabajos realizados.
- Calificaciones y reseñas.

Los clientes podrán:

- Buscar trabajadores.
- Explorar profesionales cercanos.
- Filtrar resultados.
- Consultar perfiles.
- Solicitar servicios.
- Recibir o acordar cotizaciones.
- Programar trabajos.
- Comunicarse con profesionales.
- Calificar servicios realizados.

---

## 5. Usuarios principales

### 5.1 Cliente

Persona que utiliza la plataforma para buscar y contratar un servicio.

### 5.2 Trabajador / Profesional

Persona independiente que utiliza la plataforma para ofrecer servicios y conseguir clientes.

Ejemplos:

- Electricistas.
- Plomeros.
- Albañiles.
- Carpinteros.
- Pintores.
- Jardineros.
- Personal de limpieza.
- Mecánicos.
- Técnicos.
- Otros trabajadores independientes.

### 5.3 Administrador

Usuario responsable de gestionar y supervisar la plataforma.

Entre sus responsabilidades estarán:

- Revisar perfiles de trabajadores.
- Aprobar o rechazar perfiles.
- Gestionar categorías.
- Gestionar usuarios.
- Atender reportes.
- Supervisar certificaciones.
- Moderar contenido.

---

## 6. Regla principal de publicación de trabajadores

La creación de un perfil profesional será gratuita.

Sin embargo, completar un perfil no significa que este sea publicado automáticamente.

Antes de aparecer públicamente en la plataforma, un trabajador deberá enviar su perfil a revisión administrativa.

Flujo inicial:

`Borrador`
→ `Pendiente de aprobación`
→ `Aprobado`

También podrá ocurrir:

`Pendiente de aprobación`
→ `Rechazado`
→ `Corrección del perfil`
→ `Pendiente de aprobación`

Un trabajador que no haya sido aprobado no podrá aparecer públicamente:

- En búsquedas.
- En mapas.
- En recomendaciones.
- En resultados por categoría.

La aprobación administrativa será gratuita.

---

## 7. Certificación de trabajadores

La aprobación administrativa y la certificación representan procesos diferentes.

### Aprobación

- Obligatoria para aparecer públicamente.
- Gratuita.
- Realizada por un administrador.

### Certificación

- Opcional.
- De pago.
- Precio inicial planteado: **Bs 50**.
- Permitirá mostrar una insignia de trabajador certificado.

Un trabajador deberá estar aprobado antes de poder mostrar una certificación.

La duración de la certificación, renovación, requisitos adicionales y mecanismo definitivo de pago se encuentran pendientes de definición.

No se deben asumir estas reglas hasta que sean formalmente establecidas.

---

## 8. Flujo principal del cliente

Flujo conceptual inicial:

`Ingresar`
→ `Buscar servicio`
→ `Encontrar profesionales`
→ `Aplicar filtros`
→ `Consultar perfil`
→ `Solicitar servicio`
→ `Acordar cotización`
→ `Programar trabajo`
→ `Comunicarse`
→ `Completar servicio`
→ `Calificar`

---

## 9. Flujo principal del trabajador

Flujo conceptual inicial:

`Registrarse`
→ `Crear perfil profesional`
→ `Agregar servicios`
→ `Definir tarifas`
→ `Definir disponibilidad`
→ `Agregar portafolio`
→ `Enviar perfil a revisión`
→ `Esperar aprobación`

Una vez aprobado:

`Perfil público`
→ `Recibir solicitudes`
→ `Cotizar`
→ `Aceptar trabajos`
→ `Gestionar agenda`
→ `Comunicarse con clientes`
→ `Completar servicios`
→ `Recibir calificaciones`

---

## 10. Flujo principal del administrador

Flujo conceptual inicial:

`Ingresar al panel administrativo`
→ `Revisar solicitudes de aprobación`
→ `Consultar información del trabajador`
→ `Aprobar o rechazar perfil`
→ `Gestionar usuarios`
→ `Gestionar categorías`
→ `Revisar reportes`
→ `Gestionar certificaciones`
→ `Supervisar actividad de la plataforma`

---

## 11. Alcance inicial del MVP

El MVP estará enfocado en demostrar el ciclo principal de funcionamiento de la plataforma.

El alcance inicial contempla:

- Registro de usuarios.
- Inicio de sesión.
- Roles de cliente y trabajador.
- Creación de perfil profesional.
- Servicios y categorías.
- Tarifas.
- Disponibilidad.
- Portafolio.
- Envío de perfil para aprobación.
- Aprobación y rechazo administrativo.
- Publicación de perfiles aprobados.
- Búsqueda de profesionales.
- Geolocalización.
- Visualización en mapa.
- Filtros.
- Perfil público del trabajador.
- Solicitudes de servicio.
- Cotizaciones.
- Comunicación entre cliente y trabajador.
- Programación de servicios.
- Calificaciones y reseñas.
- Favoritos.
- Reportes básicos.
- Certificación de trabajadores.
- Panel administrativo.

Este alcance podrá ser refinado mediante los requisitos formales del proyecto.

---

## 12. Elementos fuera del alcance inicial

No forman parte obligatoria de la primera versión:

- Aplicación iOS.
- Procesamiento completo del pago de los servicios contratados.
- Retención automática de comisiones por cada trabajo.
- Sistema financiero tipo marketplace.
- Microservicios.
- Infraestructura Kubernetes.
- Inteligencia artificial como requisito central.
- Expansión internacional.
- Seguimiento GPS permanente de trabajadores.

Estos elementos podrán considerarse como futuras ampliaciones.

---

## 13. Arquitectura tecnológica prevista

La arquitectura inicial propuesta utiliza un modelo de monolito modular.

### Aplicación móvil

- React Native.
- Expo.
- TypeScript.
- Expo Router.

### Backend

- Supabase.

### Base de datos

- PostgreSQL.
- PostGIS.

### Autenticación

- Supabase Auth.

### Archivos

- Supabase Storage.

### Tiempo real

- Supabase Realtime.

### Geolocalización

- Google Maps.
- React Native Maps.
- Expo Location.
- PostGIS.

### Administración

- Next.js.
- TypeScript.

### Control de versiones

- Git.
- GitHub.

---

## 14. Principios de desarrollo

El proyecto deberá priorizar:

1. Correcta definición de requisitos.
2. Arquitectura mantenible.
3. Seguridad.
4. Privacidad.
5. Experiencia de usuario.
6. Trazabilidad.
7. Pruebas.
8. Documentación continua.
9. Desarrollo modular.
10. Cumplimiento del alcance académico dentro del tiempo disponible.

---

## 15. Principios de diseño

Contrátame! utilizará una experiencia principalmente móvil y orientada a Android.

La interfaz deberá:

- Tener jerarquía visual clara.
- Utilizar patrones móviles familiares.
- Mantener consistencia.
- Evitar elementos decorativos innecesarios.
- Priorizar accesibilidad y facilidad de uso.
- Evitar diseños genéricos asociados a interfaces generadas automáticamente.
- Utilizar el color azul como identidad principal y verde como color de apoyo.

La mascota oficial es un oso caricaturesco vestido con camiseta azul y atendiendo una llamada.

Su uso deberá ser moderado y reservado principalmente para:

- Splash screen.
- Onboarding.
- Estados vacíos importantes.
- Momentos específicos de identidad de marca.

---

## 16. Decisiones pendientes

Las siguientes decisiones todavía no han sido formalmente definidas:

- Duración de la certificación de Bs 50.
- Política de renovación de certificación.
- Proceso exacto de verificación necesario para obtener la certificación.
- Pasarela de pago para la certificación.
- Método de pago futuro entre cliente y trabajador dentro de la plataforma.
- Comisión futura de la plataforma, si existiera.
- Radio máximo de búsqueda por defecto.
- Política definitiva de ubicación y privacidad.
- Alcance exacto de verificación de identidad.
- Políticas de cancelación.
- Política de disputas entre cliente y trabajador.

Estas decisiones deberán documentarse antes de ser implementadas.