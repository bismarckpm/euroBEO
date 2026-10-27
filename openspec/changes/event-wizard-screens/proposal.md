# Proposal

## Why

El asistente quedó montado sobre la revisión: presupuesto, datos del evento, todas las B.E.O. y generar conviven en la misma vista. La asistente no recorre un paso a la vez y la pantalla sigue siendo difícil de usar.

## What Changes

- Crear o abrir un evento recorre pantallas separadas, en este orden: el PDF del presupuesto, los datos del evento, una B.E.O. por pantalla, generar y la tabla de archivos.
- Cada pantalla muestra solo su paso. Arriba queda el avance (por ejemplo «3 de 8 · Plaza Caracas · Montaje») y la marca «Revisar» en las que faltan.
- En la B.E.O., Anterior y Siguiente cambian de pantalla. Siguiente salta las que ya están en cero.
- Si el memorándum tiene pendientes o errores, tiene su pantalla antes de generar. Si ya está en cero, se salta.
- Generar vive en su propia pantalla, con generar B.E.O., generar memorándum y generar ambos. Siguen deshabilitadas mientras haya pendientes o errores.
- Al terminar, la pantalla de archivos muestra la tabla: evento, número, lugar, fecha y contenido.
- Al reabrir un evento, el recorrido empieza en el primer paso que falte. Si ya está listo, abre en Generar.

Fuera de alcance: partir una B.E.O. en más pantallas (cabecera, alimentos, personal), cambiar la regla de día por lugar, el reparto de Sistemas, el correlativo, la anulación, borrar copias de Drive y la hoja de precios.

## Capabilities

### New Capabilities

### Modified Capabilities

- `event-review`: el asistente pasa de una sola revisión a pantallas separadas, una por paso.
- `event-history`: abrir un evento entra al asistente en el primer paso pendiente, o en Generar si ya no falta nada.

## Impact

- Rutas nuevas bajo `src/app/(private)/eventos/[id]/asistente`. La revisión actual deja de ser la pantalla de trabajo.
- Se reutilizan los campos, las líneas y la ventana de agregar línea. No hay un segundo editor ni un cambio de base de datos.
- La página de presupuestos sigue sirviendo para guardar una versión nueva; «Crear evento» la usa como primera pantalla.
