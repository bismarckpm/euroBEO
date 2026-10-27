# Spec Delta

## MODIFIED Requirements

### Requirement: Salida estructurada y validada
El sistema MUST pedir a la IA una salida con esquema JSON cerrado por tipo de tarea y MUST validarla con Zod y contra el catálogo cuando el campo lo requiera; si la validación falla, el campo MUST quedar "Pendiente". La IA MUST NOT resolver ni validar el lugar del evento, que se toma del texto del presupuesto.

#### Scenario: Salón fuera de catálogo
- **WHEN** se procesa un bloque cuyo lugar es "Stand Calox"
- **THEN** no se envía el lugar a la IA y se usa el texto del presupuesto

#### Scenario: Horario válido
- **WHEN** la IA interpreta "Hora: 08:00 a 06:00 pm" como 08:00 a 18:00
- **THEN** el horario se guarda con estado "IA"
