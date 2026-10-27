# Spec Delta

## ADDED Requirements

### Requirement: Generar solo las B.E.O.
El sistema MUST poder generar las B.E.O. del evento sin generar el memorándum. La regla de una página y el correlativo MUST seguir aplicando.

#### Scenario: Sin memorándum
- **WHEN** la asistente genera solo las B.E.O. de un evento que también tiene memorándum propuesto
- **THEN** existen los archivos de las B.E.O. y no existe un archivo nuevo de memorándum
