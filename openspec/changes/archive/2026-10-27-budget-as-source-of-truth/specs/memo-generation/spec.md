# Spec Delta

## ADDED Requirements

### Requirement: Número propuesto
El sistema MUST proponer el número del memorándum como el entero siguiente al último emitido, MUST permitir que la asistente lo edite antes de generar y MUST NOT dejar ese campo en "Pendiente". Al generar MUST guardar como último emitido el número usado cuando sea mayor.

#### Scenario: Siguiente número
- **WHEN** el último memorándum emitido es 89 y el presupuesto dispara el memo de estacionamiento
- **THEN** el campo número muestra 90 con estado "Regla"

#### Scenario: Número editado
- **WHEN** la asistente cambia el número propuesto de 90 a 92 y genera
- **THEN** el memorándum sale con 92 y el último emitido queda en 92
