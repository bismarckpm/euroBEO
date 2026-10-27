# Spec Delta

## ADDED Requirements

### Requirement: Generar el memorándum aparte
El sistema MUST poder generar el memorándum del evento sin generar las B.E.O. El número MUST seguir la misma propuesta que cuando se genera junto con ellas.

#### Scenario: Solo el memorándum
- **WHEN** el último memorándum emitido es 89 y la asistente genera solo el memorándum
- **THEN** el archivo queda con el número 90 y no se crea ninguna B.E.O. nueva
