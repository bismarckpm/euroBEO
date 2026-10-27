# Tasks

## 1. Estados

- [x] 1.1 Agregar el estado "Sin dato" al modelo de campos y a la UI de revisión; no suma al contador de pendientes
- [x] 1.2 Reglas de asignación: resuelto → Regla; ausente o marcador vacío ("...", "-", en blanco) → Sin dato; texto no interpretable → Pendiente; pruebas unitarias
- [x] 1.3 Migrar los campos existentes "Pendiente" que correspondan a marcadores vacíos

## 2. Lugar del evento

- [x] 2.1 Extraer el lugar del bloque (primera línea antes de horario, montaje o pax, o el valor de "Salón:") con pruebas: "Stand Calox", "Piscina", "Salón Zafiro", bloque sin lugar
- [x] 2.2 Quitar "Salón"/"Salon" solo al inicio; unificar con el catálogo si coincide; si no, usar el texto tal cual con estado Regla
- [x] 2.3 Clave de partición por lugar normalizado; prueba con un stand y una piscina el mismo día
- [x] 2.4 Quitar los candidatos de salón de la tarea de IA `block_fields`; prueba de que el lugar no se envía a la IA

## 3. Sin exigencias de contenido

- [x] 3.1 Cartelera propuesta con el título del evento en estado Regla
- [x] 3.2 Secciones vacías omitidas en la B.E.O.; pruebas de evento sin alimentos y de evento sin personal
- [x] 3.3 Validación previa al render sin exigencia de precio en alimentos; prueba de alimento sin precio
- [x] 3.4 Validación de estructura: solo encabezado de tabla reconocible; prueba de presupuesto sin totales
- [x] 3.5 Revisar el código en busca de otras exigencias de contenido no previstas en las specs y reportarlas antes de quitarlas

## 4. Verificación

- [x] 4.1 Actualizar `scan-calox`: lugar "Stand Calox" en Regla y garantía en Sin dato; el evento se genera sin intervención
- [x] 4.2 Confirmar que la cata, Reumatología y Nena siguen en verde (datos y visual)
- [x] 4.3 `docker compose run --rm app npm test` y `npm run test:e2e` en verde

## 5. Ajustes antes de archivar

- [x] 5.1 Dejar «Ítem sin total» y la diferencia de noches como avisos que no bloquean la generación
- [x] 5.2 «Validar» de OCR resaltado, fuera del contador y sin bloquear «Confirmar y generar»
- [x] 5.3 Proponer el número de memorándum desde el último emitido, editable y en Regla; configurarlo junto al correlativo
- [x] 5.4 Mostrar los totales distintos entre escaneo y digital como alertas, sin fallar la conciliación
- [x] 5.5 `docker compose run --rm app npm test` y `npm run test:e2e` en verde
