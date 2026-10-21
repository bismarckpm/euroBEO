# budget-ingestion Specification

## Purpose

Carga del PDF del presupuesto de un evento y su conversión en un modelo estructurado y validado (cabecera, días, bloques, salones, ítems, totales y beneficios) a partir del cual se generan las B.E.O. y los memorándums.

## Requirements

### Requirement: Carga del presupuesto en PDF
El sistema MUST aceptar la carga de un archivo PDF de presupuesto con capa de texto y MUST rechazar otros formatos y PDF sin texto con un mensaje claro.

#### Scenario: PDF válido
- **WHEN** la asistente sube el PDF del presupuesto de Congreso de Reumatología
- **THEN** el sistema lo acepta e inicia la lectura

#### Scenario: PDF escaneado
- **WHEN** la asistente sube un PDF sin capa de texto
- **THEN** el sistema lo rechaza indicando que el PDF debe ser digital y no escaneado

#### Scenario: Presupuesto repetido
- **WHEN** se sube un presupuesto cuyo localizador y cliente ya existen
- **THEN** el sistema pregunta si es una nueva versión del mismo evento

### Requirement: Extracción de cabecera y cliente
El sistema MUST extraer localizador, fecha de emisión, check-in, check-out, ejecutivo, empresa, persona de contacto, teléfonos, dirección, correo y RIF cuando existan, y MUST extraer el título del evento.

#### Scenario: Cabecera completa
- **WHEN** se procesa el presupuesto de Gran Encuentro Nena
- **THEN** la empresa es "Droguería Nena", el contacto "Luis Mendoza" y el título "GRAN ENCUENTRO NENA 2026"

#### Scenario: Campos vacíos
- **WHEN** el presupuesto no trae persona de contacto ni RIF
- **THEN** esos campos quedan vacíos sin error

### Requirement: Estructura de días, bloques e ítems
El sistema MUST reconstruir los días, los bloques (montaje, evento, desmontaje u otro) con su salón, horario, tipo de montaje, pax y renta, y los ítems de cada sección con cantidad, descripción completa, noches/días, tarifa y total.

#### Scenario: Descripción multilínea
- **WHEN** un ítem de 150 almuerzos tiene entrada, principal y postre en líneas distintas
- **THEN** el ítem conserva cantidad 150 y la descripción completa en orden

#### Scenario: Bloque de varios días
- **WHEN** un bloque está fechado "23 y 24 de octubre de 2026" con 2 noches
- **THEN** el bloque queda asociado a las dos fechas

#### Scenario: Renta con descuento
- **WHEN** un bloque muestra renta regular 4,500.00, "Renta especial 35% descuento" y total 5.850,00 por 2 días
- **THEN** el bloque registra renta regular 4.500,00 y renta neta total 5.850,00

#### Scenario: Renta en cortesía
- **WHEN** la columna de total del salón dice "CORTESÍA" o "Incluido en el evento"
- **THEN** la renta se marca como cortesía sin monto

### Requirement: Variantes de encabezado de bloque
El sistema MUST reconocer el tipo de cada bloque (montaje, evento o desmontaje) a partir de variantes configurables de su encabezado, y MUST tratar como evento cualquier encabezado no reconocido.

#### Scenario: Día previo de montaje
- **WHEN** el bloque del 22 de octubre se titula "Día previo de montaje"
- **THEN** el bloque se interpreta como montaje

#### Scenario: Encabezado desconocido
- **WHEN** un bloque se titula "Jornada inaugural"
- **THEN** el bloque se interpreta como evento

### Requirement: Lectura tolerante de montos
El sistema MUST interpretar montos en formato `1.234,56` y `1,234.56`, con o sin paréntesis o guiones decorativos, y MUST almacenarlos como valores exactos en céntimos.

#### Scenario: Formatos decorativos
- **WHEN** la tarifa aparece como "( 25,00)" y otra como "- 58,50-"
- **THEN** se interpretan como 25,00 y 58,50 positivos

### Requirement: Cuadre de totales
El sistema MUST sumar los totales de los ítems y rentas y compararlos con el subtotal del presupuesto; si no coinciden, MUST mostrar la diferencia y las líneas involucradas y MUST NOT permitir continuar sin que la asistente lo justifique.

#### Scenario: Cuadre correcto
- **WHEN** se procesa el almuerzo FARMA cuyo subtotal es 4.231,00
- **THEN** la suma de ítems es 4.231,00 y el presupuesto queda listo

#### Scenario: Cuadre con diferencia
- **WHEN** la suma no coincide con el subtotal
- **THEN** el sistema muestra la diferencia y solicita revisar o justificar antes de continuar

### Requirement: Validación de estructura
El sistema MUST verificar que el PDF contiene cabecera, al menos un bloque con encabezado de tabla y una sección de totales; si falta algo, MUST indicar la página y la sección con problema.

#### Scenario: Plantilla distinta
- **WHEN** se sube un PDF que no tiene encabezado de tabla reconocible
- **THEN** el sistema detiene el proceso e indica en qué página no encontró la tabla

### Requirement: Normalización por reglas
El sistema MUST resolver por reglas y catálogo el salón, horario, tipo de montaje, pax y sección destino de cada ítem; cada campo resuelto MUST quedar con estado "Regla" y cada campo no resuelto con estado "Pendiente".

#### Scenario: Salón resuelto por alias
- **WHEN** el bloque dice "Salón: Topacio"
- **THEN** el salón queda resuelto como "Topacio" con estado "Regla"

#### Scenario: Pax no numérico
- **WHEN** el bloque dice "N° Pax: ..."
- **THEN** el pax queda vacío con estado "Pendiente"

### Requirement: Beneficios y disparadores
El sistema MUST extraer los ítems de la sección BENEFICIOS y MUST detectar en beneficios y cláusulas las palabras clave configuradas para cada tipo de memorándum.

#### Scenario: Tarifa plana de estacionamiento
- **WHEN** BENEFICIOS incluye "Se otorga tarifa plana de estacionamiento para los invitados del evento"
- **THEN** el presupuesto queda con el disparador del memorándum de estacionamiento
