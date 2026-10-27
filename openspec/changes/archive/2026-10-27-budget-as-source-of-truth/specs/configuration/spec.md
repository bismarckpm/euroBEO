# Spec Delta

## MODIFIED Requirements

### Requirement: Catálogo de salones con alias
El sistema MUST mantener un catálogo opcional de nombres oficiales y alias de espacios, usado solo para unificar distintas escrituras del mismo lugar ignorando mayúsculas, acentos y la palabra "salón". Un lugar que no coincide con el catálogo MUST usarse tal como viene en el presupuesto.

#### Scenario: Resolver alias
- **WHEN** el presupuesto dice "Salon Plaza Real A y B" y existe el alias "Plaza Real A y B"
- **THEN** el lugar se unifica al nombre oficial configurado

#### Scenario: Salón desconocido
- **WHEN** un texto de lugar no coincide con ningún nombre ni alias, como "Cancha de pádel"
- **THEN** el sistema usa "Cancha de pádel" como lugar con estado "Regla"

## ADDED Requirements

### Requirement: Último número de memorándum
El sistema MUST guardar el último número de memorándum emitido y MUST permitir que la asistente lo ajuste. El próximo número propuesto MUST ser el entero siguiente.

#### Scenario: Ajuste del último memo
- **WHEN** la asistente indica que el último memorándum emitido es 89
- **THEN** el próximo número propuesto es 90
