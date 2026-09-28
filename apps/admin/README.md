# Contrátame! Administración

Panel Next.js de MOD-03. Usa la misma identidad de Supabase y requiere una fila `user_roles(role = 'admin')`; no incluye registro ni credenciales privilegiadas.

1. Copia `.env.example` a `.env.local`.
2. Configura la URL y clave publicable del mismo proyecto Supabase.
3. Ejecuta `npm run dev`.

La asignación inicial de administradores se realiza fuera del cliente mediante un procedimiento operativo autorizado. Nunca se usa una clave `service_role` en esta aplicación.
