# Tasks

## 1. Conexión

- [x] 1.1 Variables de entorno (`GOOGLE_SERVICE_ACCOUNT_JSON` o credenciales OAuth, `DRIVE_ROOT_FOLDER_ID`, `DRIVE_UPLOAD_PDF`)
- [x] 1.2 Cliente `googleapis` detrás de una interfaz `DriveClient` con implementación simulada para pruebas
- [x] 1.3 Guía en `README.md` para crear la cuenta de servicio y compartir la carpeta raíz

## 2. Subida

- [x] 2.1 Búsqueda o creación de la carpeta del año
- [x] 2.2 Cálculo del siguiente sufijo de versión libre
- [x] 2.3 Subida de .docx (y PDF si está activado) sin conversión
- [x] 2.4 Campos de estado, enlace e intentos en `GeneratedDocument`; reintentos con espera creciente
- [x] 2.5 Pruebas con cliente simulado: carpeta nueva, versión v2, error y reintento

## 3. Interfaz

- [x] 3.1 Estado de subida por documento en la pantalla del evento, con botón de reintento y enlace
- [ ] 3.2 Prueba manual contra una carpeta de prueba en el Drive del hotel
