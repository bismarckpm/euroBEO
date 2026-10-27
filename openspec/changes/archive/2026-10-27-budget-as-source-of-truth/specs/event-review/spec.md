# Spec Delta

## MODIFIED Requirements

### Requirement: Estado visible por campo
Cada campo MUST mostrar su estado: Regla (sin marca), IA (resaltado para validar), Pendiente (vino en el presupuesto y no se pudo interpretar, leer o clasificar), Sin dato (el presupuesto no lo trae; vacío y sin acción requerida) o Validar (leído por OCR; resaltado, sin sumar al contador y sin bloquear la generación).

#### Scenario: Campo interpretado por IA
- **WHEN** el horario de una B.E.O. fue interpretado por la IA
- **THEN** el campo aparece resaltado y se valida con un clic

#### Scenario: Validar un campo
- **WHEN** la asistente valida un campo con estado IA
- **THEN** el campo pasa a estado confirmado y el contador se actualiza

#### Scenario: Campo sin dato
- **WHEN** la garantía de una B.E.O. tiene estado "Sin dato"
- **THEN** se muestra vacía, no suma al contador de pendientes y la asistente puede completarla si quiere

#### Scenario: Lectura de OCR
- **WHEN** la empresa leída por OCR está en "Validar"
- **THEN** el campo se muestra resaltado, no suma al contador de pendientes y "Confirmar y generar" sigue habilitado si no hay otro pendiente

### Requirement: Confirmar y generar
El botón "Confirmar y generar" MUST habilitarse cuando no haya campos "Pendiente" ni errores de la validación previa. Los campos "Sin dato" y "Validar" MUST NOT impedirlo ni sumar al contador. Al pulsarlo MUST iniciar la generación de todas las B.E.O. y memorándums del evento.

#### Scenario: Campos pendientes
- **WHEN** queda al menos un campo con estado "Pendiente" en el evento
- **THEN** el botón está deshabilitado y muestra cuántos faltan

#### Scenario: Errores de validación
- **WHEN** un ítem de alimentos no tiene sección
- **THEN** el botón está deshabilitado y la revisión señala el ítem y la B.E.O. afectada

#### Scenario: Evento completo
- **WHEN** no quedan pendientes ni errores y la asistente pulsa "Confirmar y generar"
- **THEN** se inicia la generación de documentos del evento

#### Scenario: Solo campos sin dato
- **WHEN** el evento de Calox tiene la garantía en "Sin dato" y ningún campo "Pendiente"
- **THEN** el botón está habilitado y la B.E.O. se genera con la garantía vacía

#### Scenario: OCR sin confirmar
- **WHEN** el escaneo de Calox tiene campos en "Validar" y ningún campo "Pendiente"
- **THEN** el contador queda en cero y el botón genera la B.E.O.

### Requirement: Validación de valores leídos por OCR
En eventos originados en un escaneo, cada valor leído por OCR MUST mostrarse resaltado con estado "Validar" junto al recorte de la imagen de donde se leyó, excepto los montos de fila que no generan alerta. Los datos de cabecera y del cliente MUST quedar en "Validar". Ese estado MUST NOT sumar al contador de pendientes ni bloquear "Confirmar y generar". Las alertas de montos MUST mostrarse en la revisión de presupuestos digitales y escaneados, sin bloquear la generación.

#### Scenario: Nombre de la ejecutiva
- **WHEN** el OCR lee "Jeamette García" en la cabecera
- **THEN** el campo aparece resaltado con el recorte de la imagen al lado y la asistente puede corregirlo a "Jeannette García" sin que ese campo impida generar

#### Scenario: Monto verificado
- **WHEN** el total de la fila "Asistentes de servicio" cuadra con cantidad por tarifa
- **THEN** el monto no requiere validación manual
