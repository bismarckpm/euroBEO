# Spec Delta

## ADDED Requirements

### Requirement: Etiqueta de logística
El sistema MUST reconocer como logística impresa una fila de totales que empieza por «Logística» o por un porcentaje seguido de «Logística» o de «de Logística». El monto MUST ser el impreso en esa fila. El sistema MUST NOT recalcular ese porcentaje ni alertar porque no coincida con el subtotal o con alimentos y bebidas.

#### Scenario: Porcentaje delante
- **WHEN** los totales traen subtotal 58.357,50, «1% de Logística» por 368,40, IVA 9.337,20 y total general 68.063,10, y las filas suman el subtotal
- **THEN** la logística queda en 368,40, no hay alerta de total y no se sugiere otro monto

#### Scenario: Sin el «de»
- **WHEN** la fila de totales dice «1% Logística» y el monto impreso es 368,40
- **THEN** la logística queda en 368,40

#### Scenario: Sin porcentaje
- **WHEN** la fila de totales empieza por «Logística» y el monto impreso es 587,79
- **THEN** la logística queda en 587,79
