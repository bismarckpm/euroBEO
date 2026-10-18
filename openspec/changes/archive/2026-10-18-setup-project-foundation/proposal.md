# Proposal

## Why

El MVP del generador de B.E.O. y memorándums necesita una base técnica común antes de construir cualquier funcionalidad: un proyecto TypeScript con Next.js, base de datos PostgreSQL, LibreOffice disponible para convertir documentos, despliegue local con Docker Compose y acceso protegido para la única usuaria (la asistente de ventas). Sin esta base, cada change siguiente tendría que resolver infraestructura por su cuenta.

## What Changes

- Proyecto Next.js (App Router) + React con TypeScript estricto, ESLint y Prettier.
- Estructura de carpetas con la lógica de negocio aislada en `src/core` (sin dependencias de Next.js).
- PostgreSQL con Prisma: esquema inicial con la entidad de usuario y la tabla de auditoría.
- Docker Compose con dos servicios: `app` (Node LTS + LibreOffice headless) y `db` (PostgreSQL).
- Acceso con un único usuario y contraseña (sesión por cookie segura), creado por script de siembra.
- Perfil de la usuaria con nombre y cargo (se usará como firma de los memorándums).
- Configuración por variables de entorno (`.env.example`), Vitest y Playwright listos.
- Carpeta `fixtures/` excluida de git para los presupuestos y B.E.O. reales.

Fuera de alcance: roles, permisos, registro de usuarios, recuperación de contraseña por correo y cualquier funcionalidad de negocio.

## Capabilities

### New Capabilities
- `platform-foundation`: base técnica del proyecto (estructura, base de datos, contenedores, configuración, auditoría y pruebas).
- `user-access`: acceso protegido de la única usuaria y su perfil de firma.

### Modified Capabilities

## Impact

Crea el repositorio de la aplicación. Dependencias nuevas: next, react, typescript, prisma, @prisma/client, zod, bcrypt (o argon2), vitest, playwright. Imagen Docker con LibreOffice. Todos los changes posteriores dependen de este.
