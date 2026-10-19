# Proposal

## Why

El requisito más importante del cliente es que los documentos respeten al 100% el formato del hotel y que cada B.E.O. ocupe una sola página. Para lograrlo, los documentos se generan llenando las plantillas Word originales, nunca recreando el diseño por código ni por IA.

## What Changes

- Preparación de las plantillas .docx originales del hotel con marcadores de docxtemplater.
- Generación de cada B.E.O. en .docx a partir del borrador confirmado.
- Conversión a PDF con LibreOffice headless y verificación de una página por B.E.O.
- Si una B.E.O. no cabe en una página: mover Sistemas a una B.E.O. aparte del mismo día y salón (RN-13); si aun así no cabe, marcarla para que la asistente la divida.
- Asignación del correlativo al generar (consecutivo, editable) y fecha de preparación.
- Nombre de archivo con el patrón actual ("B.E.O. 0.940 NOMBRE EVENTO").
- Descarga individual y del evento completo en .zip.
- Validación de marcadores al cargar una nueva versión de plantilla.

Fuera de alcance: subida a Google Drive (la cubre `add-drive-archiving`), memorándums (los cubre `add-parking-memo`, que reutiliza este motor).

## Capabilities

### New Capabilities
- `document-generation`: generación de B.E.O. en Word y PDF desde las plantillas originales, con correlativo, verificación de una página y descarga.

### Modified Capabilities

## Impact

Módulo `src/core/documents` (render docx, conversión, conteo de páginas), carpeta `templates/`, modelos `Template` y `GeneratedDocument`, dependencias docxtemplater, pizzip y pdf-lib. Requiere las plantillas .docx originales del hotel.
