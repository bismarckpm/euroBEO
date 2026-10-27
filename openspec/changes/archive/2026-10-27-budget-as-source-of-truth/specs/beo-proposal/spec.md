# Spec Delta

## MODIFIED Requirements

### Requirement: Una B.E.O. por día y salón
El sistema MUST proponer una B.E.O. por cada combinación de fecha y lugar del presupuesto, entendiendo por lugar cualquier espacio del hotel (salón, stand, piscina, habitación, cancha, área del lobby u otro). Dos escrituras del mismo lugar que solo difieren en mayúsculas o acentos MUST considerarse el mismo lugar.

#### Scenario: Varios salones el mismo día
- **WHEN** un miércoles tiene tres salones contratados
- **THEN** se proponen tres B.E.O. para ese miércoles, una por salón

#### Scenario: Validación con Reumatología
- **WHEN** se procesa el presupuesto de Congreso de Reumatología (montaje el 22 en Zafiro y Topacio; evento el 23 y 24 en ambos)
- **THEN** se proponen 6 B.E.O.

#### Scenario: Espacios que no son salones
- **WHEN** un mismo día tiene un stand y un área de la piscina
- **THEN** se proponen dos B.E.O., una para el stand y otra para la piscina

### Requirement: Llenado de campos de la B.E.O.
El sistema MUST llenar cabecera, día, fecha, horario, columna EVENTO, lugar, garantía, renta, cartelera, alimentos y bebidas, secciones de la columna derecha, personal, instrucciones especiales y tipo de montaje a partir del presupuesto y la configuración, con estado por campo. La cartelera MUST proponerse con el título del evento, editable y sin bloquear la generación.

#### Scenario: Garantía igual al pax
- **WHEN** el bloque indica 120 pax
- **THEN** la garantía de la B.E.O. es 120

#### Scenario: Renta en cortesía
- **WHEN** la renta del bloque es cortesía
- **THEN** el campo RENTA DE SALÓN queda vacío o con guion

#### Scenario: Cartelera sugerida
- **WHEN** el título del evento es "CONGRESO NACIONAL DE REUMATOLOGÍA"
- **THEN** la cartelera se propone con ese texto con estado "Regla", editable por la asistente

## ADDED Requirements

### Requirement: El presupuesto como única fuente
La B.E.O. MUST contener solo lo que trae el presupuesto. El sistema MUST NOT exigir secciones, servicios ni datos que el presupuesto no incluya: una sección sin líneas MUST omitirse y un campo sin dato MUST quedar vacío, sin bloquear la generación.

#### Scenario: Evento sin alimentos
- **WHEN** un presupuesto solo incluye el espacio y personal de montaje
- **THEN** la B.E.O. se genera sin la sección Alimentos y Bebidas y sin alertas por su ausencia

#### Scenario: Evento sin personal ni seguridad
- **WHEN** un presupuesto no incluye personal ni seguridad
- **THEN** la B.E.O. se genera sin esas secciones

#### Scenario: Pax no informado
- **WHEN** el bloque de Calox dice "... Personas"
- **THEN** la garantía queda vacía con estado "Sin dato" y la B.E.O. se puede generar
