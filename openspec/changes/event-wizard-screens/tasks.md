# Tasks

## 1. Secuencia de pasos

- [x] 1.1 En `src/core/review/guide.ts`, definir la secuencia datos, cada B.E.O., el memorándum solo si tiene pendientes o errores, generar y archivos. Verificar con una prueba que Siguiente desde Plaza Caracas en cero abre «Por definir», y que un memorándum en cero no entra en la secuencia.
- [x] 1.2 Calcular el paso de entrada: el primero con pendientes o errores, o generar si no falta nada. Verificar que un evento listo no abre una B.E.O. y que uno con Topacio pendiente abre esa B.E.O.

## 2. Datos y B.E.O.

- [x] 2.1 Crear la ruta de datos del evento, con cartelera, compañía, contacto y teléfono, y el avance arriba. Verificar en una prueba de extremo a extremo que, tras guardar el presupuesto, esa pantalla no muestra alimentos ni generar.
- [x] 2.2 Crear la ruta de una B.E.O., con solo sus campos, sus líneas, la ventana de agregar línea, unir, separar y el caso dorado. Anterior y Siguiente cambian de ruta y Siguiente salta las que están en cero. Verificar en la misma prueba que Siguiente no abre Plaza Caracas en cero.

## 3. Memorándum, generar y archivos

- [x] 3.1 Crear la ruta del memorándum y mostrarla solo cuando tenga pendientes o errores. Verificar que, si está en cero, el paso siguiente a la última B.E.O. es generar.
- [x] 3.2 Crear la ruta de generar, con generar B.E.O., generar memorándum y generar ambos, deshabilitadas mientras haya pendientes o errores. Verificar que esas acciones no están en la ruta de la B.E.O. y que cada una genera solo lo que nombra.
- [x] 3.3 Crear la ruta de archivos, con una fila por archivo (evento, número, lugar, fecha y contenido) y la regeneración. Verificar en la prueba de generación que esa pantalla no muestra el editor de la B.E.O.

## 4. Entrada

- [x] 4.1 Hacer que «Abrir», el enlace posterior al PDF y `/eventos/[id]/revision` entren en el primer paso pendiente, o en generar si ya está listo. Verificar el recorrido con la prueba de extremo a extremo del grupo 2.
