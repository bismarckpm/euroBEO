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

## ADDED Requirements

### Requirement: Verificación aritmética reforzada
El sistema MUST verificar para todo presupuesto, digital o escaneado: cantidad × tarifa × días = total en cada fila, suma de filas = subtotal, IVA = 16 % del subtotal, logística = 1 % de la base de alimentos y bebidas, total = subtotal + IVA + logística e IGTF = 3 % cuando exista, con tolerancia de 0,01. Cada ecuación que no cuadre MUST señalar la celda involucrada; si una única corrección de dígito la hace cuadrar, MUST proponerse como sugerencia sin aplicarse automáticamente.

#### Scenario: Escaneo que cuadra
- **WHEN** se verifica el escaneo de Calox
- **THEN** cuadran filas, subtotal 186,50, IVA 29,84, logística 0,50 sobre 50,00 de alimentos y bebidas, y total 216,84

#### Scenario: Dígito mal leído
- **WHEN** el OCR lee la tarifa del supervisor como 53,50 y el total de la fila es 58,50
- **THEN** la fila se señala y se sugiere 58,50 como corrección para que la asistente la confirme

### Requirement: Conciliación con el PDF digital
Cuando un evento se originó en un escaneo y luego se sube el PDF digital del mismo evento, el sistema MUST compararlos, mostrar solo las diferencias en ítems, cantidades, montos, fechas y salones, y ofrecer regenerar como nueva versión las B.E.O. afectadas.

#### Scenario: Digital sin diferencias
- **WHEN** el PDF digital coincide con lo leído del escaneo
- **THEN** el evento pasa a origen digital sin cambios en las B.E.O.

#### Scenario: Digital con un cambio
- **WHEN** el PDF digital tiene 3 asistentes de servicio en lugar de 2
- **THEN** se muestra esa diferencia y se ofrece regenerar la B.E.O. afectada como nueva versión
