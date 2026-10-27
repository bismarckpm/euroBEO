# Tasks

## 1. Agregar línea y señal

- [x] 1.1 Cambiar `AddLine` por un botón que abre una ventana con cantidad, descripción y precio. Verificar con una prueba de la revisión que confirmar crea la línea, que cerrar no crea nada y que sin descripción no se guarda.
- [x] 1.2 Marcar en la lista cada B.E.O. con pendientes o error de validación, también si no está seleccionada. Verificar que «Por definir» se marca y Plaza Caracas en cero no.

## 2. Asistente y generación

- [x] 2.1 Añadir «Crear evento» en el listado y llevar la carga del presupuesto al primer paso, abriendo después la primera B.E.O. con pendientes. Verificar el recorrido con una prueba de extremo a extremo.
- [x] 2.2 Sustituir «Confirmar y generar» por generar B.E.O., generar memorándum y generar ambos, deshabilitados mientras haya pendientes o errores. Verificar que cada acción genera solo lo que nombra.
- [x] 2.3 Al terminar, mostrar la tabla con evento, número, lugar, fecha y contenido (montaje, evento, desmontaje, sistemas o memorándum). Verificar una fila por archivo en la prueba del paso anterior.

## 3. Eliminar evento

- [x] 3.1 Agregar en el listado la eliminación con confirmación de cliente y nombre, borrando el evento en cascada y la carpeta generada, sin cambiar el correlativo. Verificar que un evento en revisión y uno generado desaparecen y que el último número de B.E.O. no baja.
