# Spec Delta

## MODIFIED Requirements

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

### Requirement: Cuadre de totales
El sistema MUST comparar la suma de los totales de ítems y rentas con el subtotal impreso. Si difieren en más de 0,01, MUST mostrar esa diferencia como alerta de montos, con el monto impreso, el calculado y la diferencia. La asistente MUST poder corregir el valor o marcar la alerta como revisada. El sistema MUST NOT impedir la carga ni la generación por esa diferencia.

#### Scenario: Cuadre correcto
- **WHEN** se procesa el almuerzo FARMA cuyo subtotal es 4.231,00
- **THEN** la suma de ítems es 4.231,00 y no hay alerta de subtotal

#### Scenario: Cuadre con diferencia
- **WHEN** la suma no coincide con el subtotal
- **THEN** el sistema guarda el presupuesto, muestra la alerta con el impreso, el calculado y la diferencia, y permite continuar sin justificación

## ADDED Requirements

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
Cuando un evento se originó en un escaneo y luego se sube el PDF digital del mismo evento, el sistema MUST compararlos, mostrar solo las diferencias en ítems, cantidades, montos, fechas y salones, y ofrecer regenerar como nueva versión las B.E.O. afectadas.

#### Scenario: Digital sin diferencias
- **WHEN** el PDF digital coincide con lo leído del escaneo
- **THEN** el evento pasa a origen digital sin cambios en las B.E.O.

#### Scenario: Digital con un cambio
- **WHEN** el PDF digital tiene 3 asistentes de servicio en lugar de 2
- **THEN** se muestra esa diferencia y se ofrece regenerar la B.E.O. afectada como nueva versión
