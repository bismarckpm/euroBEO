# Proposal

## Why

Si un cliente cambia algo de último momento, la asistente necesita volver al evento, corregir y regenerar una B.E.O. sin cargar todo de nuevo. También necesita encontrar rápidamente eventos ya procesados para descargar sus documentos.

## What Changes

- Historial de eventos procesados con búsqueda por cliente, evento, fecha y localizador.
- Estado por evento (en revisión, generado).
- Reapertura de un evento generado para editar y regenerar una o varias B.E.O. o memorándums como nueva versión.
- Conservación de cada versión generada con su fecha y comparación con la anterior.
- Anulación de una B.E.O. sin reutilizar su número.

Fuera de alcance: reportes, estadísticas, búsqueda dentro del contenido de los documentos.

## Capabilities

### New Capabilities
- `event-history`: historial de eventos, versiones de documentos, regeneración y anulación.

### Modified Capabilities

## Impact

Página `/eventos` (lista y búsqueda), acciones de reapertura, regeneración y anulación, campo de versión y estado anulado en `Beo` y `GeneratedDocument`. Se integra con `add-drive-archiving` para subir las nuevas versiones.
