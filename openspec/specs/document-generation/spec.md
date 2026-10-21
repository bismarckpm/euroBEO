# document-generation Specification

## Purpose

Generación de las B.E.O. confirmadas en Word editable y PDF a partir de las plantillas originales del hotel, con correlativo, verificación de una página por B.E.O. y descarga.

## Requirements

### Requirement: Generación desde la plantilla original
El sistema MUST generar cada B.E.O. llenando la plantilla .docx original del hotel con marcadores, MUST NOT recrear el diseño por código ni por IA, y MUST conservar tipografía, logos, tablas, negritas y posiciones.

#### Scenario: Comparación con B.E.O. real
- **WHEN** se genera la B.E.O. de Federación China con los mismos datos de la B.E.O. 0.830
- **THEN** el documento generado coincide visualmente con la B.E.O. emitida por el hotel

#### Scenario: Sección vacía
- **WHEN** una B.E.O. no tiene ítems de Descorche
- **THEN** la sección Descorche no aparece en el documento

### Requirement: Una página por B.E.O.
El sistema MUST verificar que cada B.E.O. generada ocupe una sola página; si excede, MUST mover la sección Sistemas a una B.E.O. adicional del mismo día y salón con título "SISTEMAS" en la columna derecha, y si aun así excede, MUST marcar la B.E.O. para que la asistente la divida.

#### Scenario: B.E.O. que no cabe
- **WHEN** una B.E.O. de Congreso Pets ocupa dos páginas por sus servicios de internet
- **THEN** se generan dos B.E.O.: la principal sin Sistemas y otra solo con Sistemas, ambas de una página

#### Scenario: Excede sin Sistemas
- **WHEN** una B.E.O. excede una página y no tiene Sistemas
- **THEN** queda marcada como "Excede una página" y la asistente decide cómo dividirla

### Requirement: Correlativo
Al confirmar la generación, el sistema MUST asignar a cada B.E.O. el siguiente número consecutivo con formato 0.NNN/AA, MUST permitir que la asistente lo ajuste y MUST advertir si un número ya fue usado.

#### Scenario: Asignación consecutiva
- **WHEN** el último número emitido es 0.947/26 y se generan 3 B.E.O.
- **THEN** reciben 0.948/26, 0.949/26 y 0.950/26 en orden de fecha y salón

#### Scenario: Número repetido
- **WHEN** la asistente cambia un número a uno ya emitido
- **THEN** el sistema muestra una advertencia antes de generar

### Requirement: Word editable y PDF
El sistema MUST producir cada B.E.O. en .docx editable y en PDF, con la fecha de preparación del día de generación.

#### Scenario: Archivos generados
- **WHEN** termina la generación de un evento
- **THEN** cada B.E.O. tiene un .docx y un .pdf disponibles

### Requirement: Nombre de archivo
Los archivos MUST nombrarse con el patrón actual del hotel: "B.E.O. " + número + " " + nombre del evento en mayúsculas.

#### Scenario: Nombre de una B.E.O.
- **WHEN** se genera la B.E.O. 0.948/26 del evento "Congreso Nacional de Reumatología"
- **THEN** el archivo se llama "B.E.O. 0.948 CONGRESO NACIONAL DE REUMATOLOGIA.docx"

### Requirement: Descarga
El sistema MUST permitir descargar cada documento por separado y todos los documentos del evento en un archivo .zip.

#### Scenario: Descarga del evento
- **WHEN** la asistente pulsa "Descargar todo"
- **THEN** recibe un .zip con los .docx y .pdf del evento

### Requirement: Validación de plantillas
Al cargar una nueva versión de plantilla, el sistema MUST verificar que contiene todos los marcadores requeridos y MUST rechazarla si falta alguno; los documentos ya generados MUST conservar la versión de plantilla con la que se crearon.

#### Scenario: Plantilla incompleta
- **WHEN** se sube una plantilla sin el marcador de cartelera
- **THEN** el sistema la rechaza indicando el marcador faltante

### Requirement: Plantilla de referencia con posiciones fijas
La plantilla de la B.E.O. MUST construirse sobre el .docx de referencia aprobado por la asistente, con el número de orden y "Preparado el día" en el encabezado superior derecho y las iniciales en un párrafo después de la tabla. El código MUST limitarse a llenar marcadores y MUST NOT agregar, mover ni eliminar bloques del documento.

#### Scenario: Encabezado
- **WHEN** se genera la B.E.O. de la cata
- **THEN** "ORDEN DE SERVICIO # No. 0.955/26" y "Preparado el día: 19/10/2026" aparecen arriba a la derecha y "JG/AR" debajo de la tabla

### Requirement: Formato de alimentos y bebidas en la plantilla
La plantilla MUST imprimir cada ítem de alimentos con el título en negrita, sus líneas de menú, "Incluye:" en negrita, la nota en negrita, "N° pax: {pax}" cuando exista y "Precio: USD {precio} c/u x pax"; y MUST imprimir los subgrupos de personal con sus etiquetas, omitiendo los vacíos.

#### Scenario: Ítem de pasapalos
- **WHEN** el ítem es "Pasapalos 01 p/p", "Shot de tequeño picamiel", 150 pax a 2,00
- **THEN** la columna Alimentos y Bebidas muestra el título, la línea del menú, "N° pax: 150" y "Precio: USD 2,00 c/u x pax"

### Requirement: Validación previa al render
Antes de generar, el sistema MUST validar los datos de cada B.E.O. y MUST bloquear la generación indicando B.E.O. y campo cuando: una línea no tiene sección, hay alimentos en el presupuesto pero la sección Alimentos y Bebidas está vacía, un ítem de alimentos no tiene precio, una línea de personal no tiene subgrupo, o algún texto a imprimir contiene el estado "Pendiente".

#### Scenario: Comida sin clasificar
- **WHEN** un ítem de comida quedó sin sección
- **THEN** no se genera el documento y se indica qué ítem y en qué B.E.O. falta clasificar
