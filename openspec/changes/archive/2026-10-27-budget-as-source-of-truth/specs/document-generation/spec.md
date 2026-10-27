# Spec Delta

## MODIFIED Requirements

### Requirement: Validación previa al render
Antes de generar, el sistema MUST bloquear la generación, indicando B.E.O. y campo, solo cuando algo del presupuesto no llegó a la B.E.O.: una línea sin sección, personal sin subgrupo, alimentos del presupuesto ausentes de la B.E.O., o un texto a imprimir con el estado "Pendiente". MUST NOT exigir precios, secciones ni datos que el presupuesto no trae.

#### Scenario: Comida sin clasificar
- **WHEN** un ítem de comida quedó sin sección
- **THEN** no se genera el documento y se indica qué ítem y en qué B.E.O. falta clasificar

#### Scenario: Alimento sin precio
- **WHEN** un ítem de alimentos viene en el presupuesto sin precio
- **THEN** la B.E.O. se genera mostrando el ítem sin línea de precio
