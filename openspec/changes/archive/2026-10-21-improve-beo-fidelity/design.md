# Design

## Context

Comparación de la salida del sistema contra la B.E.O. 0.955/26 de la asistente para el presupuesto de la cata (fixtures/golden/cata-eleaexeltis). El presupuesto tiene un único bloque "MONTAJE" que contiene el salón, "PERSONAL MONTAJE", una sección de comida mal titulada ("CENA CONFERENCIA") y "PERSONAL" del evento. Es un patrón frecuente: las ejecutivas reutilizan la plantilla y no siempre renombran los encabezados.

## Goals / Non-Goals

**Goals:**
- Que la B.E.O. generada para la cata coincida con la de la asistente, salvo precios ajustados a mano.
- Que ningún error ya reportado pueda reaparecer sin que falle una prueba.

**Non-Goals:**
- Inferir precios de la hoja de precios.
- Reescribir el parser del PDF.

## Decisions

- **Plantilla de referencia = .docx de la asistente.** Se parte de su archivo, no de una reconstrucción. Los marcadores se insertan en las mismas celdas y párrafos; número y "Preparado el día" en el encabezado superior derecho; iniciales en un párrafo después de la tabla. Se prohíbe en el código cualquier operación que agregue o mueva bloques del documento.
- **Contrato estructurado**:
  - `foodItems[]`: `{ title, lines[], includes?, note?, paxLabel?, unitPrice, priceSuffix }` → la plantilla imprime título en negrita, líneas, "Incluye:" en negrita, nota en negrita, "N° pax: {pax}" y "Precio: USD {unitPrice} c/u x pax".
  - `staff`: `{ setup[], service[], teardown[] }` con etiquetas configurables ("Montaje:", "Servicio Evento:", "Desmontaje:"); un subgrupo vacío no se imprime.
  - `rightSections[]`: `{ title, lines[] }` solo con secciones que tienen líneas.
- **N° pax de un ítem de A&B**: si la cantidad coincide con el pax del bloque, se imprime "N° pax: {cantidad}". Si no coincide (p. ej. 58 tablas para 150 pax), se omite la línea de pax, se conserva la nota del presupuesto y el ítem queda en estado "IA/validar" para la asistente.
- **Clasificación por ítem**, en este orden: (1) catálogo de ítems, (2) mapeo del encabezado, (3) respaldo: encabezado desconocido con ítems de comida o por persona → ALIMENTOS, (4) IA, (5) Pendiente. La palabra "Pendiente" es un estado interno y nunca un título de sección.
- **Subgrupo de personal** por encabezado: contiene "MONTAJE" → setup; contiene "DESMONTAJE" → teardown; cualquier otro encabezado de personal ("PERSONAL", "PERSONAL EVENTO", "PERSONAL PARA EL SERVICIO…") → service. El tipo de bloque solo se usa si el encabezado no permite decidir.
- **Columna EVENTO**: si la B.E.O. contiene A&B o personal de servicio, es de evento aunque el bloque diga MONTAJE; el tipo sale del catálogo de tipos de evento buscando palabras clave en el título ("CATA DE VINO" → "CATA"); sin coincidencia → "Evento". Solo montaje → "Montaje"; solo desmontaje → "Desmontaje".
- **Cálculo de mesas** (activable): si el tipo de montaje indica "para N personas" y la nota dice "Se calculan X por mesa", la nota se completa como "Se calculan X tablas por mesa - M mesas" con M = redondeo hacia arriba de pax ÷ N (150 ÷ 8 = 19).
- **Validación previa al render** con Zod sobre `BeoTemplateData` más reglas de negocio; devuelve errores legibles por B.E.O. y campo.
- **Regresión visual**: el PDF generado se rasteriza (pdftoppm, 100 dpi) y se compara con la imagen de referencia con pixelmatch; umbral configurable (por defecto 1 % de píxeles distintos). Las diferencias de valores ajustados a mano se neutralizan alimentando el caso dorado con los mismos valores finales de la asistente.

## Risks / Trade-offs

- La comparación visual es sensible a fuentes y versión de LibreOffice. Mitigación: correr las pruebas dentro del mismo contenedor de producción y fijar versiones.
- El respaldo "sección desconocida con comida → ALIMENTOS" puede clasificar mal un ítem raro. Mitigación: queda marcado para validar en la revisión.
