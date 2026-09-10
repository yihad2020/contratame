# Contrátame! — Índice de Documentación Técnica

Este directorio contiene la documentación técnica oficial del proyecto Contrátame!.

La documentación almacenada aquí constituye la fuente técnica de verdad del proyecto y debe mantenerse actualizada junto con el desarrollo del software.

El archivo `AGENTS.md` ubicado en la raíz del repositorio define las reglas generales que deben seguir los agentes de desarrollo, mientras que este documento indica dónde se encuentra cada tipo de información.

---

# Estructura documental

## 00 — Proyecto

Ruta:

`docs/00-project/`

Contiene la definición general del proyecto.

Incluye:

- Descripción del producto.
- Problema identificado.
- Propuesta de solución.
- Usuarios principales.
- Alcance.
- Limitaciones.
- Reglas generales del producto.
- Decisiones pendientes.

Documento principal:

`docs/00-project/project-definition.md`

Consultar esta sección cuando sea necesario comprender:

- Qué es Contrátame!.
- Qué problema busca resolver.
- Qué usuarios existen.
- Qué funcionalidades pertenecen al alcance general.
- Qué decisiones todavía no han sido tomadas.

---

## 01 — Requisitos

Ruta:

`docs/01-requirements/`

Contendrá la especificación formal del sistema.

Incluye:

- Requisitos funcionales.
- Requisitos no funcionales.
- Criterios de aceptación.
- Reglas de negocio.
- Matriz de trazabilidad.

Identificadores:

- Requisitos funcionales: `RF-XXX`
- Requisitos no funcionales: `RNF-XXX`

Antes de implementar una funcionalidad, deberán identificarse los requisitos relacionados.

Ejemplo:

`RF-007 — El sistema deberá impedir que un trabajador no aprobado aparezca públicamente.`

---

## 02 — Arquitectura

Ruta:

`docs/02-architecture/`

Contendrá la arquitectura técnica del sistema.

Incluye:

- Arquitectura general.
- Arquitectura móvil.
- Arquitectura backend.
- Arquitectura administrativa.
- Comunicación entre componentes.
- Integraciones externas.
- Diagramas de arquitectura.
- Límites entre módulos.

Consultar esta sección antes de:

- Introducir nuevas tecnologías.
- Crear nuevos servicios.
- Cambiar la estructura principal de la aplicación.
- Agregar integraciones importantes.

---

## 03 — Base de datos

Ruta:

`docs/03-database/`

Contendrá el diseño formal de la base de datos.

Incluye:

- Modelo entidad-relación.
- Esquema lógico.
- Diccionario de datos.
- Relaciones.
- Restricciones.
- Índices.
- Políticas de seguridad.
- Row Level Security.
- Consideraciones PostGIS.

Toda modificación estructural de la base de datos deberá quedar representada mediante migraciones versionadas.

---

## 04 — Módulos

Ruta:

`docs/04-modules/`

Contendrá la documentación funcional y técnica de cada módulo.

Formato de identificador:

`MOD-XX`

Ejemplos previstos:

- `MOD-01 — Autenticación`
- `MOD-02 — Perfiles de trabajadores`
- `MOD-03 — Aprobación administrativa`
- `MOD-04 — Certificación`
- `MOD-05 — Servicios`
- `MOD-06 — Geolocalización`
- `MOD-07 — Solicitudes`
- `MOD-08 — Cotizaciones`
- `MOD-09 — Reservas`
- `MOD-10 — Chat`
- `MOD-11 — Calificaciones`
- `MOD-12 — Administración`

La numeración definitiva podrá cambiar conforme se formalice la arquitectura.

Cada módulo deberá documentar como mínimo:

- Objetivo.
- Usuarios involucrados.
- Requisitos relacionados.
- Flujo principal.
- Reglas de negocio.
- Datos involucrados.
- Casos excepcionales.
- Consideraciones de seguridad.
- Criterios de aceptación.

---

## 05 — Decisiones de arquitectura

Ruta:

`docs/05-decisions/`

Contendrá los Architecture Decision Records.

Formato:

`ADR-XXX`

Cada ADR documentará una decisión técnica importante.

Ejemplos:

- Uso de React Native y Expo.
- Uso de Supabase.
- Uso de PostgreSQL.
- Uso de PostGIS.
- Separación entre aprobación y certificación.
- Estrategia de geolocalización.
- Estrategia de autenticación.

Un ADR deberá indicar:

1. Contexto.
2. Problema.
3. Alternativas consideradas.
4. Decisión.
5. Motivo.
6. Consecuencias.

Las decisiones importantes no deben quedar únicamente implícitas en el código.

---

## 06 — Pruebas

Ruta:

`docs/06-testing/`

Contendrá la estrategia y evidencia de pruebas.

Incluye:

- Estrategia general.
- Pruebas unitarias.
- Pruebas de integración.
- Pruebas end-to-end.
- Pruebas de seguridad.
- Pruebas de usabilidad.
- Casos de prueba.
- Resultados.

Los requisitos deberán poder relacionarse con pruebas verificables.

---

## 07 — Bitácora de implementación

Ruta:

`docs/07-implementation-log/`

Contendrá el historial cronológico de implementaciones del proyecto.

Formato:

`IMP-XXX`

Cada implementación significativa deberá registrar:

- Fecha.
- Módulo.
- Requisitos relacionados.
- Objetivo.
- Cambios realizados.
- Impacto en base de datos.
- Archivos principales modificados.
- Pruebas realizadas.
- Resultado.
- Referencia al commit o Pull Request.

Ejemplo:

`IMP-014 — Implementación del flujo de aprobación de trabajadores`

Esta sección servirá posteriormente como fuente para actualizar automáticamente la documentación académica almacenada en Google Drive.

---

# Jerarquía de conocimiento

Cuando exista una duda durante el desarrollo, utilizar el siguiente orden:

1. Requisitos documentados.
2. Reglas de negocio documentadas.
3. Arquitectura documentada.
4. Diseño de base de datos.
5. Especificación del módulo.
6. Architecture Decision Records.
7. Código existente.

No deben inventarse reglas de negocio para resolver ambigüedades.

Cuando una decisión no esté definida, debe registrarse como pendiente y consultarse antes de implementarla.

---

# Flujo de documentación

Cada nueva funcionalidad deberá seguir, idealmente, este flujo:

`Necesidad`

→ `Requisito`

→ `Criterios de aceptación`

→ `Módulo`

→ `Impacto arquitectónico`

→ `Impacto en base de datos`

→ `Implementación`

→ `Pruebas`

→ `Registro de implementación`

→ `Pull Request`

→ `Merge`

→ `Sincronización con documento académico`

---

# Principio de trazabilidad

Debe ser posible responder preguntas como:

- ¿Qué requisito originó esta funcionalidad?
- ¿Qué módulo la implementa?
- ¿Qué tablas utiliza?
- ¿Qué decisión arquitectónica la respalda?
- ¿Qué pruebas la validan?
- ¿En qué implementación fue agregada?
- ¿En qué commit fue introducida?

Ejemplo:

`RF-007`

→ `MOD-03`

→ `worker_approval_requests`

→ `ADR-005`

→ `TEST-021`

→ `IMP-014`

→ `PR #18`

---

# Idioma

La documentación académica y funcional del proyecto se redactará principalmente en español.

El código fuente podrá utilizar nombres técnicos en inglés cuando esto mejore consistencia y mantenibilidad.

Ejemplo:

Documentación:

`Trabajador pendiente de aprobación`

Código:

`approval_status = 'pending_approval'`

---

# Mantenimiento

La documentación deberá actualizarse junto con el software.

No se considerará completa una implementación significativa si deja desactualizados:

- Requisitos.
- Arquitectura.
- Esquema de base de datos.
- Documentación del módulo.
- Pruebas.
- Bitácora de implementación.

El objetivo es evitar documentar retrospectivamente seis meses de desarrollo al finalizar el proyecto.