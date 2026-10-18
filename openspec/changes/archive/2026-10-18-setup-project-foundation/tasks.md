# Tasks

## 1. Proyecto base

- [x] 1.1 Crear proyecto Next.js (App Router) con TypeScript estricto, ESLint y Prettier
- [x] 1.2 Crear estructura `src/app`, `src/core/{budget,normalization,beo,memo,documents,drive,config}`, `src/lib`, `templates/`, `fixtures/`
- [x] 1.3 Agregar `fixtures/` y `.env` a `.gitignore`; crear `fixtures/README.md` explicando qué copiar ahí
- [x] 1.4 Agregar utilidades de formato en `src/lib/format.ts`: montos `1.234,56`, fechas `dd/mm/aaaa` y `dd.mm.aaaa`, día de la semana en español con mayúscula inicial
- [x] 1.5 Pruebas unitarias de las utilidades de formato

## 2. Configuración y base de datos

- [x] 2.1 Validar variables de entorno con Zod en `src/lib/env.ts`; crear `.env.example` documentado
- [x] 2.2 Configurar Prisma con PostgreSQL; modelos `User` (usuario, hash, nombre, cargo) y `AuditLog`
- [x] 2.3 Helper `src/lib/audit.ts` para registrar acciones
- [x] 2.4 Pruebas de validación de entorno y del helper de auditoría

## 3. Contenedores

- [x] 3.1 Dockerfile multi-etapa de la app sobre Node LTS con LibreOffice headless y fuentes (incluir las fuentes de la plantilla del hotel cuando se conozcan)
- [x] 3.2 `docker-compose.yml` con servicios `app` y `db` (volumen persistente) y migración automática al arrancar
- [x] 3.3 Script de verificación que convierte un .docx de prueba a PDF dentro del contenedor
- [x] 3.4 Documentar en `README.md` cómo levantar el entorno local y de desarrollo

## 4. Acceso

- [x] 4.1 Página de inicio de sesión y ruta de autenticación con hash (argon2 o bcrypt)
- [x] 4.2 Middleware que protege páginas y rutas de API; cookie httpOnly firmada
- [x] 4.3 Script de siembra `npm run seed:user` (usuario, contraseña, nombre, cargo)
- [x] 4.4 Pantalla de perfil para editar nombre y cargo; cierre de sesión
- [x] 4.5 Pruebas: acceso sin sesión, login correcto e incorrecto, logout (Playwright)
