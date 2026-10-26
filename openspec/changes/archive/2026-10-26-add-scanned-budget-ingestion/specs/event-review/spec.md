# Spec Delta

## ADDED Requirements

### Requirement: Validación de valores leídos por OCR
En eventos originados en un escaneo, cada valor leído por OCR MUST mostrarse con estado "validar" junto al recorte de la imagen de donde se leyó, excepto los montos de fila que no generan alerta. Los datos de cabecera y del cliente MUST quedar siempre para validar. Las alertas de montos MUST mostrarse en la revisión de presupuestos digitales y escaneados, sin bloquear la generación.

#### Scenario: Nombre de la ejecutiva
- **WHEN** el OCR lee "Jeamette García" en la cabecera
- **THEN** el campo aparece para validar con el recorte de la imagen al lado y la asistente lo corrige a "Jeannette García"

#### Scenario: Monto verificado
- **WHEN** el total de la fila "Asistentes de servicio" cuadra con cantidad por tarifa
- **THEN** el monto no requiere validación manual
