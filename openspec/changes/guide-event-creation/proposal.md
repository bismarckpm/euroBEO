# Proposal

## Why

La asistente no distingue qué B.E.O. le falta por revisar, confunde el formulario vacío de agregar una línea con un pendiente, y el camino desde el presupuesto hasta los archivos generados no le dice qué documento es cada uno.

## What Changes

- En Eventos, un botón «Crear evento» abre un asistente: primero el PDF del presupuesto y después cada B.E.O. que tenga algo por revisar, una por una.
- Cuando no queda nada pendiente, el asistente ofrece tres acciones: generar las B.E.O., generar el memorándum o generar ambos.
- Al terminar, una tabla lista cada archivo con el evento, el número, el lugar, la fecha y qué contiene (montaje, evento, desmontaje, sistemas o memorándum).
- Cada B.E.O. de la lista lleva una señal visible si tiene pendientes o un error de validación, aunque no sea la que está abierta.
- «Agregar línea» es un botón. Los campos de cantidad, descripción y precio aparecen en una ventana y la línea solo se crea al confirmar.
- En el listado de eventos se puede eliminar un evento en revisión o ya generado.

Fuera de alcance: cambiar la regla de una B.E.O. por día y lugar, el reparto de Sistemas, el correlativo, la anulación de un número, borrar archivos ya subidos a Drive, y la hoja de precios.

## Capabilities

### New Capabilities

### Modified Capabilities

- `event-history`: crear un evento desde el listado y eliminarlo de la base de datos.
- `event-review`: asistente salón por salón, señal de pendiente, agregar línea en una ventana, y la tabla de archivos.
- `document-generation`: generar solo las B.E.O., solo el memorándum, o ambos.
- `memo-generation`: generar el memorándum sin generar las B.E.O.

## Impact

- Listado en `src/app/(private)/eventos` y la revisión en `eventos/[id]/revision`.
- La carga del presupuesto pasa a ser el primer paso del asistente; la página de presupuestos sigue disponible para una versión nueva.
- Borrado del evento, sus presupuestos, B.E.O., memorándums y archivos generados en disco. Los números ya emitidos no se reutilizan. Lo subido a Drive no se borra.
