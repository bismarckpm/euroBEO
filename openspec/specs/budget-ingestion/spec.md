# budget-ingestion Specification

## Purpose

Carga del PDF del presupuesto de un evento y su conversión en un modelo estructurado y validado (cabecera, días, bloques, salones, ítems, totales y beneficios) a partir del cual se generan las B.E.O. y los memorándums.

## Requirements

### Requirement: Carga del presupuesto en PDF
El sistema MUST aceptar la carga de un archivo PDF de presupuesto, tenga o no capa de texto: los PDF digitales MUST leerse directamente y los PDF sin texto MUST procesarse por la vía de OCR. El sistema MUST rechazar otros formatos con un mensaje claro.

#### Scenario: PDF válido
- **WHEN** la asistente sube el PDF del presupuesto de Congreso de Reumatología
- **THEN** el sistema lo acepta e inicia la lectura

#### Scenario: PDF escaneado
- **WHEN** la asistente sube un PDF sin capa de texto
- **THEN** el sistema lo procesa por OCR e indica en el evento que su origen es un escaneo

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
El sistema MUST comparar la suma de los totales de ítems y rentas con el subtotal impreso. Si difieren en más de 0,01, MUST mostrar esa diferencia como alerta de montos, con el monto impreso, el calculado y la diferencia. La asistente MUST poder corregir el valor o marcar la alerta como revisada. El sistema MUST NOT impedir la carga ni la generación por esa diferencia.

#### Scenario: Cuadre correcto
- **WHEN** se procesa el almuerzo FARMA cuyo subtotal es 4.231,00
- **THEN** la suma de ítems es 4.231,00 y no hay alerta de subtotal

#### Scenario: Cuadre con diferencia
- **WHEN** la suma no coincide con el subtotal
- **THEN** el sistema guarda el presupuesto, muestra la alerta con el impreso, el calculado y la diferencia, y permite continuar sin justificación

### Requirement: Validación de estructura
El sistema MUST verificar solo lo mínimo para leer el presupuesto: que exista al menos un encabezado de tabla reconocible. Cabecera, datos del cliente y sección de totales MUST ser opcionales. Si no hay tabla reconocible, MUST indicar la página con problema.

#### Scenario: Plantilla distinta
- **WHEN** se sube un PDF que no tiene encabezado de tabla reconocible
- **THEN** el sistema detiene el proceso e indica en qué página no encontró la tabla

#### Scenario: Presupuesto sin totales
- **WHEN** un presupuesto tiene su tabla de ítems pero no trae sección de totales
- **THEN** se procesa normalmente, sin alertas de totales

### Requirement: Normalización por reglas
El sistema MUST resolver por reglas y catálogo el horario, tipo de montaje, pax y sección de cada ítem, y MUST tomar el lugar según el requisito "Lugar del evento". Lo resuelto MUST quedar "Regla"; lo que el presupuesto no trae, o trae como marcador vacío ("...", "-", en blanco), MUST quedar "Sin dato"; y el texto presente que no se pudo interpretar MUST quedar "Pendiente".

#### Scenario: Salón resuelto por alias
- **WHEN** el bloque dice "Salón: Topacio"
- **THEN** el lugar queda como "Topacio" con estado "Regla"

#### Scenario: Pax no numérico
- **WHEN** el bloque dice "N° Pax: ..."
- **THEN** el pax queda vacío con estado "Sin dato"

#### Scenario: Texto no interpretable
- **WHEN** el bloque dice "Horario: según programa del cliente" y no se puede interpretar como horario
- **THEN** el horario queda con estado "Pendiente" mostrando el texto original

### Requirement: Beneficios y disparadores
El sistema MUST extraer los ítems de la sección BENEFICIOS y MUST detectar en beneficios y cláusulas las palabras clave configuradas para cada tipo de memorándum.

#### Scenario: Tarifa plana de estacionamiento
- **WHEN** BENEFICIOS incluye "Se otorga tarifa plana de estacionamiento para los invitados del evento"
- **THEN** el presupuesto queda con el disparador del memorándum de estacionamiento

### Requirement: Alertas de montos
El sistema MUST verificar, en presupuestos digitales y escaneados, cada fila (cantidad × tarifa × días = total), el subtotal como suma de filas, el IVA como 16 % del subtotal, el total como subtotal + IVA + logística impresa y el IGTF como 3 % del total cuando existe. La tolerancia MUST ser de 0,01.

#### Scenario: Escaneo que cuadra
- **WHEN** se verifica el escaneo de Calox
- **THEN** no hay alertas: filas, subtotal 186,50, IVA 29,84 y total 216,84 usando la logística impresa de 0,50

### Requirement: Resolución de una alerta de montos
Cada diferencia MUST mostrarse en la revisión con el monto impreso, el calculado y la diferencia. La asistente MUST poder corregir el valor o marcar la alerta como revisada. Ninguna alerta MUST bloquear la generación.

#### Scenario: Fila que no cuadra
- **WHEN** una fila tiene cantidad 1, tarifa 53,50, un día y total impreso 58,50
- **THEN** la revisión muestra una alerta con impreso 58,50, calculado 53,50 y diferencia 5,00, y la generación sigue disponible

#### Scenario: IVA mal calculado
- **WHEN** el IVA impreso no es el 16 % del subtotal
- **THEN** la revisión muestra una alerta con el IVA impreso, el calculado y la diferencia, y la generación sigue disponible

#### Scenario: Alerta revisada
- **WHEN** la asistente marca la alerta como revisada o corrige el valor hasta el calculado
- **THEN** la alerta queda revisada o desaparece, y en ningún caso bloquea la generación

### Requirement: Logística impresa
El sistema MUST usar la logística impresa dentro de la ecuación del total. El sistema MUST NOT verificar la logística contra una base ni proponer una corrección de dígitos.

#### Scenario: Sin base de logística
- **WHEN** la logística impresa no es el 1 % de alimentos y bebidas
- **THEN** no hay alerta de logística y no se sugiere otro monto

#### Scenario: Logística de Nena
- **WHEN** el presupuesto de Nena trae logística impresa de 587,79
- **THEN** no hay alerta de logística y el total usa ese 587,79

### Requirement: Conciliación con el PDF digital
Cuando un evento se originó en un escaneo y luego se sube el PDF digital del mismo evento, el sistema MUST compararlos y MUST mostrar las diferencias en ítems, cantidades, montos, fechas, salones y totales impresos (subtotal, IVA, logística y total). Una diferencia de totales MUST mostrarse como alerta junto a las demás y MUST NOT marcar la conciliación como fallida ni impedir la carga o la generación. El sistema MUST ofrecer regenerar como nueva versión las B.E.O. afectadas.

#### Scenario: Digital sin diferencias
- **WHEN** el PDF digital coincide con lo leído del escaneo, incluidos los totales
- **THEN** el evento pasa a origen digital sin cambios en las B.E.O.

#### Scenario: Digital con un cambio
- **WHEN** el PDF digital tiene 3 asistentes de servicio en lugar de 2
- **THEN** se muestra esa diferencia y se ofrece regenerar la B.E.O. afectada como nueva versión

#### Scenario: Totales que no cuadran
- **WHEN** el subtotal o el total del PDF digital no coincide con el del escaneo y el resto de las filas sí
- **THEN** esa diferencia aparece junto a las demás alertas, la conciliación no falla y el presupuesto se guarda

### Requirement: Lugar del evento
El sistema MUST tomar el lugar del evento del texto del bloque del presupuesto, cualquiera que sea el espacio (salón, stand, piscina, habitación, cancha, área del lobby u otro), quitando solo la palabra "Salón" al inicio. El lugar MUST quedar "Regla" aunque no exista en el catálogo, y "Sin dato" si el bloque no trae lugar.

#### Scenario: Stand
- **WHEN** el bloque del presupuesto de Calox comienza con "Stand Calox"
- **THEN** el lugar queda como "Stand Calox" con estado "Regla"

#### Scenario: Piscina
- **WHEN** un bloque comienza con "Piscina"
- **THEN** el lugar queda como "Piscina" con estado "Regla"

#### Scenario: Salón con prefijo
- **WHEN** un bloque comienza con "Salón Zafiro"
- **THEN** el lugar queda como "Zafiro"

#### Scenario: Sin texto de lugar
- **WHEN** un bloque no trae ninguna línea de lugar antes del horario o el montaje
- **THEN** el lugar queda vacío con estado "Sin dato"

### Requirement: Avisos que no bloquean
«Ítem sin total» y la diferencia entre las noches del bloque y los días de la fecha MUST quedar como avisos. Esos avisos MUST NOT ser errores de estructura y MUST NOT impedir la carga ni la generación.

#### Scenario: Ítem sin total
- **WHEN** un ítem de la tabla no trae total
- **THEN** aparece el aviso «Ítem sin total» y el presupuesto se puede cargar y generar

#### Scenario: Noches distintas a los días
- **WHEN** un bloque indica 2 noches y la fecha cubre un solo día
- **THEN** aparece el aviso de noches y la generación sigue disponible
