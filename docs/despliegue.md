# Despliegue

Checklist del entorno del hotel. No forma parte de la suite automática.

- [ ] El correlativo de la B.E.O. está configurado con el último número real emitido. No usar 955: ese número es el de un caso de prueba, no el último de la operación.
- [ ] La base PostgreSQL del hotel está migrada (`npx prisma migrate deploy`).
- [ ] El usuario de la asistente existe (`npm run seed:user`) y la contraseña no está en el repositorio.
- [ ] Las variables de entorno (`DATABASE_URL`, `SESSION_SECRET`, Drive y la clave de IA si se usa) están fuera del código.
- [ ] LibreOffice y `pdftoppm` están disponibles en el contenedor de la aplicación. La suite dorada falla si falta alguno.
- [ ] La carpeta de Google Drive del año en curso es la que usa la asistente.
