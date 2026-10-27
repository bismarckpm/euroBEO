# Spec Delta

## MODIFIED Requirements

### Requirement: Reabrir y regenerar
La asistente MUST poder reabrir un evento generado. Al reabrirlo, el asistente MUST abrir la primera pantalla que todavía tenga pendientes o errores, o la pantalla de generar si no falta nada. Desde la pantalla de archivos MUST poder regenerar una o varias B.E.O. o memorándums como nueva versión, conservando su número.

#### Scenario: Cambio de último momento
- **WHEN** la asistente cambia el horario de la B.E.O. 0.935 y la regenera
- **THEN** se crea la versión 2 de la B.E.O. 0.935 y se sube al Drive con sufijo v2

#### Scenario: Reabrir con pendientes
- **WHEN** la asistente abre desde el listado un evento que tiene una B.E.O. con pendientes
- **THEN** entra en la pantalla de esa B.E.O.

#### Scenario: Reabrir ya listo
- **WHEN** la asistente abre un evento generado que no tiene pendientes ni errores
- **THEN** entra en la pantalla de generar
