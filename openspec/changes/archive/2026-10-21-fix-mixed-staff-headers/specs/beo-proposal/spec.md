# Spec Delta

## MODIFIED Requirements

### Requirement: Personal agrupado
El sistema MUST agrupar el personal en Montaje, Servicio Evento y Desmontaje según el encabezado de la sección de origen, buscando "montaje" y "desmontaje" como palabras completas: solo "desmontaje" va a Desmontaje, solo "montaje" va a Montaje y cualquier otro encabezado de personal va a Servicio Evento. El tipo de bloque MUST usarse cuando el encabezado no permite decidir.

#### Scenario: Personal de montaje y evento
- **WHEN** un mismo día y salón tiene personal de montaje y de evento
- **THEN** la sección PERSONAL muestra ambos subgrupos por separado

#### Scenario: Bloque titulado MONTAJE con personal de evento
- **WHEN** el presupuesto de la cata tiene un único bloque "MONTAJE" con las secciones "PERSONAL MONTAJE" y "PERSONAL"
- **THEN** el supervisor, 2 limpiadores y 1 asistente quedan en Montaje, y el supervisor, 1 limpiador, 10 asistentes y 1 cocinero quedan en Servicio Evento

## ADDED Requirements

### Requirement: Encabezados mixtos de montaje y desmontaje
Si el encabezado de una sección de personal contiene a la vez "montaje" y "desmontaje", el sistema MUST asignar el subgrupo según el tipo de bloque: Montaje en un bloque de montaje, Desmontaje en un bloque de desmontaje, y Montaje marcado para validar en un bloque de evento.

#### Scenario: Encabezado mixto en día de montaje
- **WHEN** el presupuesto de Calox tiene el bloque "Día previo de montaje" con la sección "PERSONAL PARA EL MONTAJE - DESMONTAJE" (1 supervisor y 2 asistentes de servicio)
- **THEN** ese personal queda en el subgrupo Montaje

#### Scenario: Encabezado mixto en día de evento
- **WHEN** un bloque de evento contiene la sección "PERSONAL PARA EL MONTAJE - DESMONTAJE"
- **THEN** ese personal queda en Montaje con estado "validar" para que la asistente lo confirme
