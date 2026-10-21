# Spec Delta

## ADDED Requirements

### Requirement: Variantes de encabezado de bloque
El sistema MUST reconocer el tipo de cada bloque (montaje, evento o desmontaje) a partir de variantes configurables de su encabezado, y MUST tratar como evento cualquier encabezado no reconocido.

#### Scenario: Día previo de montaje
- **WHEN** el bloque del 22 de octubre se titula "Día previo de montaje"
- **THEN** el bloque se interpreta como montaje

#### Scenario: Encabezado desconocido
- **WHEN** un bloque se titula "Jornada inaugural"
- **THEN** el bloque se interpreta como evento
