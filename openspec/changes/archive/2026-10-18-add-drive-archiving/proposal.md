# Proposal

## Why

Todas las B.E.O. del hotel se archivan en Google Drive, en formato editable y en la carpeta del año en curso, y hoy la asistente las sube a mano. Subirlas automáticamente cierra el ciclo sin pasos manuales y mantiene el archivo que el hotel ya usa para controlar el correlativo.

## What Changes

- Conexión con Google Drive mediante cuenta de servicio (o autorización OAuth de la cuenta del hotel).
- Subida automática de cada B.E.O. y memorándum generado en .docx editable (PDF opcional) a la carpeta del año en curso; la carpeta se crea si no existe.
- Regeneración = nueva versión con sufijo (v2, v3…) sin borrar la anterior.
- Estado de subida por documento, reintento ante fallo y enlace al archivo en Drive.

Fuera de alcance: leer el correlativo desde Drive, sincronización bidireccional, carpetas por evento.

## Capabilities

### New Capabilities
- `drive-archiving`: archivo automático de los documentos generados en Google Drive.

### Modified Capabilities

## Impact

Módulo `src/core/drive`, dependencia `googleapis`, variables de entorno de credenciales y carpeta raíz, campos de estado de subida en `GeneratedDocument`.
