# IMP-007 — Primera implementación de MOD-05

**Fecha:** 2026-09-29  
**Módulo:** `MOD-05 — Perfil público del trabajador`  
**Requisitos:** `RF-042..RF-048`, `RNF-028..RNF-032`  
**Pruebas:** `TEST-110..TEST-139`  
**Estado:** Implementado y validado automáticamente; verificación Android real diferida

## Cambios

- Migración `20260929010000_mod05_public_worker_profile.sql` con RPC allowlist `get_public_worker_profile(uuid)` y guard/política de lectura temporal de portafolio.
- Contrato de una fila con servicios, disponibilidad y portafolio como arreglos JSON ordenados.
- Elegibilidad revalidada para cuenta target activa, worker aprobado, ubicación y servicio/categoría activos.
- Bucket privado preservado y firma batch de URLs por 300 segundos; sin URL pública o persistida.
- Ruta móvil real `/(app)/worker/[workerId]` con validación previa, carga, no disponible, error/reintento, servicios, disponibilidad y portafolio.
- Fallback de portafolio que no bloquea el perfil cuando falla la firma o la imagen.
- Suite pgTAP MOD-05 de 50 aserciones y suite Jest de lógica pura.
- Documentación `RF/RNF → MOD-05 → TEST → IMP-007` e índices actualizados.

## Seguridad y privacidad

- RPC/guard `SECURITY DEFINER`, `search_path = ''`, objetos calificados y grants mínimos.
- Sin SELECT público adicional sobre tablas profesionales y sin cambios a ubicación privada.
- Sin contacto, UUID de perfil/Auth, coordenadas, estados administrativos, certificación ni reviews en la respuesta.
- Política Storage solo de lectura para objeto registrado de un worker actualmente elegible; owner/admin existentes permanecen.
- Sin `service_role`, secretos o dependencia nueva.

## Modelo congelado

No existe conflicto. MOD-05 agrega operaciones, política e implementación sobre entidades/columnas existentes; no agrega ni elimina entidades, relaciones, columnas, estados o reglas congeladas.

## Validación

| Control | Resultado |
|---|---|
| Reset local Supabase CLI `2.118.0` | Aprobado; aplicó MOD-01 a MOD-05. |
| pgTAP completo | Aprobado: **5 archivos / 263 aserciones**; MOD-05 ejecutó **50/50**. |
| Lint local de esquema | `public`/`private`: `No schema errors found`. |
| TypeScript | Aprobado. |
| ESLint | Aprobado. |
| Jest | Aprobado: **7 suites / 66 pruebas**. |
| Expo Doctor | Aprobado: **21/21**. |
| Dependencias Expo | Alineadas después de actualizar únicamente `expo` a `~57.0.26`, `expo-constants` a `~57.0.20` y `expo-router` a `~57.0.24`. |
| Export web | Aprobado. |
| Dry-run vinculado | Listó solo `20260929010000_mod05_public_worker_profile.sql`; no aplicó cambios. |
| `git diff --check` | Aprobado; avisos LF/CRLF únicamente informativos. |

No se ejecutó `db push`, commit ni push Git.

## Pendiente manual

La prueba manual Android real se mantiene diferida salvo confirmación explícita. No se presenta como aprobada.
