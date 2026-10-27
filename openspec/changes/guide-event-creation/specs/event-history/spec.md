# Spec Delta

## ADDED Requirements

### Requirement: Crear evento
El listado de eventos MUST ofrecer «Crear evento». Esa acción MUST abrir el asistente empezando por la carga del presupuesto.

#### Scenario: Empezar un evento
- **WHEN** la asistente pulsa «Crear evento» en el listado
- **THEN** el asistente pide el PDF del presupuesto antes de mostrar las B.E.O.

### Requirement: Eliminar evento
La asistente MUST poder eliminar del listado un evento en revisión o ya generado. El sistema MUST pedir confirmación mostrando el cliente y el nombre del evento. Al confirmar, MUST borrar el evento, sus presupuestos, B.E.O., memorándums y archivos generados en el servidor. MUST NOT reutilizar los números ya emitidos y MUST NOT borrar lo subido a Drive.

#### Scenario: Eliminar un evento en revisión
- **WHEN** la asistente confirma el borrado de un evento que sigue en revisión
- **THEN** desaparece del listado y ya no se puede abrir

#### Scenario: Eliminar un evento generado
- **WHEN** la asistente confirma el borrado de un evento ya generado
- **THEN** desaparece del listado y el próximo número de B.E.O. no vuelve a uno de los que ese evento usó
