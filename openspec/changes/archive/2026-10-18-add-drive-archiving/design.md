# Design

## Context

El hotel confirmó: Google Drive, una carpeta por año, B.E.O. en formato editable, versiones nuevas con sufijo al regenerar.

## Goals / Non-Goals

**Goals:**
- Subida confiable y visible para la asistente.
- Que una falla de Drive no impida descargar los documentos.

**Non-Goals:**
- Organizar documentos antiguos o mover archivos existentes.

## Decisions

- **Cuenta de servicio** con la carpeta raíz de B.E.O. compartida con ella. Alternativa: OAuth con la cuenta de la asistente; se mantiene como opción si el hotel no permite cuentas de servicio.
- **Carpeta del año** buscada por nombre exacto (p. ej. "2026") dentro de la carpeta raíz configurada (`DRIVE_ROOT_FOLDER_ID`); si no existe, se crea.
- **Versionado**: si ya existe un archivo con el nombre base, se sube como "… v2", "… v3" según el siguiente sufijo libre.
- **Subida asíncrona** después de generar, con estado `pendiente | subido | error` y reintento manual o automático (3 intentos con espera creciente).
- **Formato**: .docx siempre; PDF configurable (desactivado por defecto).

## Risks / Trade-offs

- Políticas de Google Workspace del hotel pueden bloquear cuentas de servicio. Mitigación: alternativa OAuth documentada.
- Si se suben los .docx, Drive puede ofrecer abrirlos como Google Docs; se suben como .docx sin conversión para no alterar el formato.
