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
