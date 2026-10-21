# Spec Delta

## ADDED Requirements

### Requirement: Validación de valores leídos por OCR
En eventos originados en un escaneo, cada valor leído por OCR MUST mostrarse con estado "validar" junto al recorte de la imagen de donde se leyó, excepto los números confirmados por la verificación aritmética. Los datos de cabecera y del cliente MUST quedar siempre para validar.

#### Scenario: Nombre de la ejecutiva
- **WHEN** el OCR lee "Jeamette García" en la cabecera
- **THEN** el campo aparece para validar con el recorte de la imagen al lado y la asistente lo corrige a "Jeannette García"

#### Scenario: Monto verificado
- **WHEN** el total de la fila "Asistentes de servicio" cuadra con cantidad por tarifa
- **THEN** el monto no requiere validación manual
