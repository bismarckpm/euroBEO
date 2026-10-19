# beo-proposal Specification

## Purpose

Partición automática de un evento en sus órdenes de servicio (B.E.O.) y llenado de cada campo a partir del presupuesto normalizado, aplicando las reglas de negocio del hotel.

## Requirements

### Requirement: Una B.E.O. por día y salón
El sistema MUST proponer una B.E.O. por cada combinación de fecha y salón del presupuesto.

#### Scenario: Varios salones el mismo día
- **WHEN** un miércoles tiene tres salones contratados
- **THEN** se proponen tres B.E.O. para ese miércoles, una por salón

#### Scenario: Validación con Reumatología
- **WHEN** se procesa el presupuesto de Congreso de Reumatología (montaje el 22 en Zafiro y Topacio; evento el 23 y 24 en ambos)
- **THEN** se proponen 6 B.E.O.

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
El sistema MUST llenar cabecera, día, fecha, horario, columna EVENTO, salón, garantía, renta, cartelera sugerida, alimentos y bebidas, secciones de la columna derecha, personal, instrucciones especiales y tipo de montaje a partir del presupuesto y la configuración, con estado por campo.

#### Scenario: Garantía igual al pax
- **WHEN** el bloque indica 120 pax
- **THEN** la garantía de la B.E.O. es 120

#### Scenario: Renta en cortesía
- **WHEN** la renta del bloque es cortesía
- **THEN** el campo RENTA DE SALÓN queda vacío o con guion

#### Scenario: Cartelera sugerida
- **WHEN** el título del evento es "CONGRESO NACIONAL DE REUMATOLOGÍA"
- **THEN** la cartelera se propone con ese texto y estado "Pendiente" hasta que la asistente la confirme

### Requirement: Montos por unidad precargados
Cada línea de la B.E.O. MUST mostrar cantidad, descripción y precio unitario precargado desde el presupuesto, en formato "USD 0,00 c/u", y MUST quedar editable.

#### Scenario: Línea de personal
- **WHEN** el presupuesto tiene 8 asistentes de servicio a 39,00
- **THEN** la B.E.O. propone "08 Asistente de Servicio USD 39,00 c/u" editable

### Requirement: Personal agrupado
El sistema MUST agrupar el personal en Montaje, Evento y Desmontaje según el bloque de origen.

#### Scenario: Personal de montaje y evento
- **WHEN** un mismo día y salón tiene personal de montaje y de evento
- **THEN** la sección PERSONAL muestra ambos subgrupos por separado

### Requirement: Sistemas en la B.E.O. principal
El sistema MUST incluir los servicios de Sistemas en su sección dentro de la B.E.O. principal del día y salón.

#### Scenario: Internet en el evento
- **WHEN** el bloque de Plaza Real incluye internet dedicado
- **THEN** aparece en la sección SISTEMAS de la B.E.O. de Plaza Real de ese día
