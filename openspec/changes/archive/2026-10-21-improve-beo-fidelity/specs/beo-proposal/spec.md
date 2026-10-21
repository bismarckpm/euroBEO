# Spec Delta

## MODIFIED Requirements

### Requirement: Personal agrupado
El sistema MUST agrupar el personal en Montaje, Servicio Evento y Desmontaje según el encabezado de la sección de origen: un encabezado que contiene "DESMONTAJE" va a Desmontaje, uno que contiene "MONTAJE" va a Montaje y cualquier otro encabezado de personal ("PERSONAL", "PERSONAL EVENTO", "PERSONAL PARA EL SERVICIO") va a Servicio Evento. El tipo de bloque MUST usarse solo cuando el encabezado no permite decidir.

#### Scenario: Personal de montaje y evento
- **WHEN** un mismo día y salón tiene personal de montaje y de evento
- **THEN** la sección PERSONAL muestra ambos subgrupos por separado

#### Scenario: Bloque titulado MONTAJE con personal de evento
- **WHEN** el presupuesto de la cata tiene un único bloque "MONTAJE" con las secciones "PERSONAL MONTAJE" y "PERSONAL"
- **THEN** el supervisor, 2 limpiadores y 1 asistente quedan en Montaje, y el supervisor, 1 limpiador, 10 asistentes y 1 cocinero quedan en Servicio Evento

## ADDED Requirements

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
