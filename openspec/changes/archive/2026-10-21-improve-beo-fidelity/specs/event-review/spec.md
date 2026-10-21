# Spec Delta

## MODIFIED Requirements

### Requirement: Confirmar y generar
El botón "Confirmar y generar" MUST habilitarse solo cuando el evento no tenga campos pendientes y la validación previa al render no reporte errores; al pulsarlo MUST iniciar la generación de todas las B.E.O. y memorándums del evento.

#### Scenario: Campos pendientes
- **WHEN** queda al menos un campo pendiente en el evento
- **THEN** el botón está deshabilitado y muestra cuántos faltan

#### Scenario: Errores de validación
- **WHEN** un ítem de alimentos no tiene sección
- **THEN** el botón está deshabilitado y la revisión señala el ítem y la B.E.O. afectada

#### Scenario: Evento completo
- **WHEN** no quedan pendientes ni errores y la asistente pulsa "Confirmar y generar"
- **THEN** se inicia la generación de documentos del evento

## ADDED Requirements

### Requirement: Registrar B.E.O. corregida como caso dorado
La asistente MUST poder adjuntar, para un evento, la B.E.O. correcta en .docx o PDF y marcarla como caso dorado candidato, para que el equipo técnico la incorpore a la suite de regresión.

#### Scenario: Reportar diferencia
- **WHEN** la asistente detecta una diferencia y adjunta su B.E.O. corregida
- **THEN** el evento queda marcado como caso dorado candidato con el presupuesto y la B.E.O. de referencia
