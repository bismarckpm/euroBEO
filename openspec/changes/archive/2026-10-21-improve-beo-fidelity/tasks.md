# Tasks

## 1. Caso dorado primero (debe fallar al inicio)

- [x] 1.1 Crear `fixtures/golden/cata-eleaexeltis/` con el PDF del presupuesto, la B.E.O. 0.955/26 de la asistente (.docx y PDF) y `final-values.json` con los valores ajustados a mano (precios de personal, cartelera, número, fecha de preparación)
- [x] 1.2 Escribir `expected.json` con el `BeoTemplateData` esperado (A&B estructurado, personal en Montaje y Servicio Evento, EVENTO = "CATA")
- [x] 1.3 Rasterizar la B.E.O. de referencia a `reference.png` (pdftoppm, 100 dpi)
- [x] 1.4 Implementar la suite de regresión: generar, comparar JSON y comparar imagen con pixelmatch (umbral configurable), guardando `diff.png` al fallar
- [x] 1.5 Confirmar que la suite falla con el comportamiento actual. Evidencia en `evidence/red-run.txt` (worktree de `fed3b562`)

## 2. Plantilla de referencia

- [x] 2.1 Reconstruir `templates/beo.docx` sobre el .docx de la asistente; número y "Preparado el día" arriba a la derecha, iniciales después de la tabla
- [x] 2.2 Marcadores estructurados para `foodItems`, `rightSections` y `staff` con negritas y etiquetas según el diseño
- [x] 2.3 Actualizar la lista de marcadores requeridos y la validación de plantillas
- [x] 2.4 Revisar el código de render y eliminar cualquier operación que agregue o mueva bloques

## 3. Motor de B.E.O.

- [x] 3.1 Clasificación por ítem con orden de prioridad y respaldo para encabezados desconocidos; "Pendiente" solo como estado
- [x] 3.2 Subgrupo de personal por encabezado de sección
- [x] 3.3 Estructura de ítems de alimentos (título, líneas, Incluye, nota, pax, precio) y regla de pax distinto a cantidad
- [x] 3.4 Deducción de la columna EVENTO con el catálogo de tipos de evento
- [x] 3.5 Cálculo de mesas activable
- [x] 3.6 Pruebas unitarias de cada regla con los datos de la cata

## 4. Validación y revisión

- [x] 4.1 Validación previa al render con errores por B.E.O. y campo
- [x] 4.2 Integrar la validación con el botón "Confirmar y generar" y mostrar los errores en la revisión
- [x] 4.3 Adjuntar B.E.O. corregida y marcar el evento como caso dorado candidato
- [x] 4.4 Prueba e2e: cargar la cata, ajustar precios de personal y generar sin errores

## 5. Configuración

- [x] 5.1 Ajustes de presentación (fuente de EVENTO, formato de fecha, mayúsculas, etiquetas de subgrupos, cálculo de mesas) en `/configuracion`
- [x] 5.2 Catálogo de tipos de evento con datos semilla
- [x] 5.3 Agregar "CENA CONFERENCIA", "CATA" y otros encabezados observados al mapeo de secciones

La verificación del correlativo en el hotel quedó en `docs/despliegue.md`. No es una tarea de este change.

## 6. Cierre

- [ ] 6.1 Suite completa en verde, incluida la cata
- [x] 6.2 Regenerar la B.E.O. de la cata y validarla visualmente con la asistente
- [x] 6.3 Incorporar como casos dorados al menos dos eventos más de la muestra (Reumatología y Nena) con sus B.E.O. correctas
