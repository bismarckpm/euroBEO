# Design

## Context

Proyecto nuevo, una sola usuaria, despliegue en un equipo o servidor local del hotel. La app necesita salida a internet solo para la API de OpenAI y Google Drive. El desarrollo será asistido por IA con OpenSpec, por lo que conviene un solo lenguaje y una estructura predecible.

## Goals / Non-Goals

**Goals:**
- Levantar todo el sistema con `docker compose up`.
- Separar la lógica de negocio (`src/core`) de la capa web para poder probarla sin Next.js.
- Dejar listas las herramientas de prueba y la auditoría que usarán los demás changes.

**Non-Goals:**
- Multiusuario, roles o SSO.
- Despliegue en la nube.

## Decisions

- **Monolito Next.js con backend en rutas de servidor.** Alternativa: servicio Node separado (Fastify). Se elige el monolito por simplicidad de despliegue para una sola usuaria; `src/core` permite separarlo después.
- **Estructura de carpetas:**
  - `src/app/` páginas y rutas de servidor (`/api/...`).
  - `src/core/` dominio puro: `budget/`, `normalization/`, `beo/`, `memo/`, `documents/`, `drive/`, `config/`.
  - `src/lib/` utilidades (db, auth, formato de montos y fechas).
  - `prisma/` esquema y migraciones. `templates/` plantillas .docx. `fixtures/` datos reales (gitignored).
- **Autenticación propia mínima.** Contraseña con hash (argon2 o bcrypt), sesión en cookie httpOnly + SameSite=Lax firmada con `SESSION_SECRET`. Alternativa: NextAuth; se descarta por exceso para un solo usuario.
- **LibreOffice dentro del contenedor `app`.** Alternativa: contenedor aparte (gotenberg). Se elige dentro del contenedor para no sumar servicios; se invoca por línea de comandos con un perfil temporal por conversión.
- **Auditoría transversal** en una tabla `AuditLog` (acción, entidad, id, antes, después, fecha) con un helper en `src/lib/audit.ts`.

## Risks / Trade-offs

- La imagen con LibreOffice pesa más (~500 MB). Aceptable para despliegue local.
- Autenticación propia exige cuidado: usar librerías estándar de hash y comparar en tiempo constante.
