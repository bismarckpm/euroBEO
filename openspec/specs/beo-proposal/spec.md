# beo-proposal Specification

## Purpose

Partición automática de un evento en sus órdenes de servicio (B.E.O.) y llenado de cada campo a partir del presupuesto normalizado, aplicando las reglas de negocio del hotel.

## Requirements

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

### Requirement: Montaje y desmontaje
El sistema MUST proponer una B.E.O. propia para un día que sea solo de montaje o solo de desmontaje, y MUST incluir el montaje o desmontaje en la B.E.O. del evento cuando ocurren el mismo día y en el mismo salón.

#### Scenario: Día solo de montaje
- **WHEN** el 13 de octubre solo hay montaje en Plaza Real
- **THEN** se propone una B.E.O. de montaje para ese día y salón

#### Scenario: Desmontaje el mismo día
- **WHEN** el último día del evento incluye personal de desmontaje
- **THEN** ese personal aparece en la B.E.O. del evento de ese día, en el subgrupo Desmontaje

### Requirement: Bloques de varios días
El sistema MUST expandir un bloque que cubre varias fechas en una B.E.O. por fecha y MUST dividir la renta neta del bloque en partes iguales entre las fechas.

#### Scenario: Renta dividida
- **WHEN** el bloque de Topacio del 23 y 24 de octubre tiene renta neta 5.850,00
- **THEN** cada una de las dos B.E.O. muestra renta 2.925,00

### Requirement: Salones combinados
El sistema MUST proponer una sola B.E.O. cuando un bloque indica varios salones combinados en una misma línea.

#### Scenario: Turmalina y Ópalo
- **WHEN** el bloque dice "Salón Turmalina - Opalo"
- **THEN** se propone una sola B.E.O. con ambos salones en el campo SALÓN

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

### Requirement: Montos por unidad precargados
Cada línea de la B.E.O. MUST mostrar cantidad, descripción y precio unitario precargado desde el presupuesto, en formato "USD 0,00 c/u", y MUST quedar editable.

#### Scenario: Línea de personal
- **WHEN** el presupuesto tiene 8 asistentes de servicio a 39,00
- **THEN** la B.E.O. propone "08 Asistente de Servicio USD 39,00 c/u" editable

### Requirement: Personal agrupado
El sistema MUST agrupar el personal en Montaje, Servicio Evento y Desmontaje según el encabezado de la sección de origen, buscando "montaje" y "desmontaje" como palabras completas: solo "desmontaje" va a Desmontaje, solo "montaje" va a Montaje y cualquier otro encabezado de personal va a Servicio Evento. El tipo de bloque MUST usarse cuando el encabezado no permite decidir.

#### Scenario: Personal de montaje y evento
- **WHEN** un mismo día y salón tiene personal de montaje y de evento
- **THEN** la sección PERSONAL muestra ambos subgrupos por separado

#### Scenario: Bloque titulado MONTAJE con personal de evento
- **WHEN** el presupuesto de la cata tiene un único bloque "MONTAJE" con las secciones "PERSONAL MONTAJE" y "PERSONAL"
- **THEN** el supervisor, 2 limpiadores y 1 asistente quedan en Montaje, y el supervisor, 1 limpiador, 10 asistentes y 1 cocinero quedan en Servicio Evento

### Requirement: Encabezados mixtos de montaje y desmontaje
Si el encabezado de una sección de personal contiene a la vez "montaje" y "desmontaje", el sistema MUST asignar el subgrupo según el tipo de bloque: Montaje en un bloque de montaje, Desmontaje en un bloque de desmontaje, y Montaje marcado para validar en un bloque de evento.

#### Scenario: Encabezado mixto en día de montaje
- **WHEN** el presupuesto de Calox tiene el bloque "Día previo de montaje" con la sección "PERSONAL PARA EL MONTAJE - DESMONTAJE" (1 supervisor y 2 asistentes de servicio)
- **THEN** ese personal queda en el subgrupo Montaje

#### Scenario: Encabezado mixto en día de evento
- **WHEN** un bloque de evento contiene la sección "PERSONAL PARA EL MONTAJE - DESMONTAJE"
- **THEN** ese personal queda en Montaje con estado "validar" para que la asistente lo confirme

### Requirement: Sistemas en la B.E.O. principal
El sistema MUST incluir los servicios de Sistemas en su sección dentro de la B.E.O. principal del día y salón.

#### Scenario: Internet en el evento
- **WHEN** el bloque de Plaza Real incluye internet dedicado
- **THEN** aparece en la sección SISTEMAS de la B.E.O. de Plaza Real de ese día

### Requirement: Clasificación por ítem con respaldo
El sistema MUST clasificar cada ítem en este orden: catálogo de ítems, mapeo del encabezado, respaldo para encabezados desconocidos (ítems de comida o por persona van a Alimentos y Bebidas), IA y, solo si nada resuelve, estado Pendiente. Pendiente MUST ser un estado de revisión y MUST NOT usarse como sección.

#### Scenario: Encabezado mal titulado
- **WHEN** la comida de la cata viene bajo el encabezado "CENA CONFERENCIA", no mapeado
- **THEN** tablas de embutidos, cata y pasapalos se clasifican en Alimentos y Bebidas; agua mineral en Bebidas y descorche en Descorche

### Requirement: Alimentos y bebidas estructurados
Cada ítem de alimentos MUST representarse con título, líneas de menú, "Incluye" y nota cuando existan, N° pax y precio unitario. Si la cantidad del ítem coincide con el pax del bloque, MUST mostrarse como N° pax; si no coincide, MUST omitirse el N° pax, conservarse la nota del presupuesto y marcarse el ítem para validar.

#### Scenario: Cata con pax
- **WHEN** el ítem "Cata" tiene 150 unidades a 3,00 y el bloque tiene 150 pax
- **THEN** el ítem tiene título "Cata", N° pax 150 y precio unitario 3,00

#### Scenario: Cantidad distinta al pax
- **WHEN** el ítem "Tablas de embutidos por persona" tiene 58 unidades y el bloque 150 pax
- **THEN** el ítem no muestra N° pax, conserva la nota "Se calculan 3 por mesa" y queda marcado para validar

### Requirement: Columna EVENTO deducida del contenido
El sistema MUST asignar "Montaje" o "Desmontaje" solo a B.E.O. que contengan únicamente servicios de montaje o desmontaje; si la B.E.O. contiene alimentos o personal de servicio, MUST asignar el tipo de evento encontrado en el título del evento según el catálogo de tipos de evento, o "Evento" si no hay coincidencia.

#### Scenario: Cata
- **WHEN** el título del evento es "CATA DE VINO" y la B.E.O. tiene alimentos y personal de servicio
- **THEN** la columna EVENTO es "CATA" aunque el bloque del presupuesto se llame MONTAJE

### Requirement: Cálculo de mesas
Cuando el ajuste esté activo, el tipo de montaje indique "para N personas" y la nota de un ítem diga "Se calculan X por mesa", el sistema MUST completar la nota con el número de mesas, calculado como pax dividido entre N y redondeado hacia arriba.

#### Scenario: 150 pax en mesas de 8
- **WHEN** el montaje es "mesas redondas para 8 personas" con 150 pax y la nota dice "Se calculan 3 por mesa"
- **THEN** la nota queda "Se calculan 3 tablas por mesa - 19 mesas"

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
