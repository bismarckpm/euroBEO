# event-review Specification

## Purpose

Revisión de las B.E.O. y memorándums propuestos de un evento, donde la asistente valida los campos marcados, corrige lo que cambió después del presupuesto y confirma la generación.

## Requirements

### Requirement: Lista de documentos del evento
El sistema MUST mostrar para cada evento la lista de B.E.O. propuestas (día, salón, tipo) y de memorándums propuestos, con el número de campos pendientes de cada uno.

#### Scenario: Evento con varias B.E.O.
- **WHEN** la asistente abre la revisión del Congreso de Reumatología
- **THEN** ve 6 B.E.O. ordenadas por fecha y salón con su contador de pendientes

### Requirement: Estado visible por campo
Cada campo MUST mostrar su estado: Regla (sin marca), IA (resaltado para validar) o Pendiente (dato faltante obligatorio).

#### Scenario: Campo interpretado por IA
- **WHEN** el horario de una B.E.O. fue interpretado por la IA
- **THEN** el campo aparece resaltado y se valida con un clic

#### Scenario: Validar un campo
- **WHEN** la asistente valida un campo con estado IA
- **THEN** el campo pasa a estado confirmado y el contador se actualiza

### Requirement: Edición de campos y líneas
La asistente MUST poder editar cualquier campo y agregar, quitar o modificar líneas (cantidad, descripción, precio unitario, sección), y cada edición MUST quedar en auditoría con valor anterior y nuevo.

#### Scenario: Ajuste de precio con la hoja de precios
- **WHEN** la asistente cambia el precio de "Asistente de Servicio" de 39,00 a 36,00
- **THEN** la línea muestra "USD 36,00 c/u" y queda registrado el cambio

#### Scenario: Cambio posterior al presupuesto
- **WHEN** el pax del almuerzo pasó de 150 a 160
- **THEN** la asistente actualiza la garantía y el N° pax y el cambio queda registrado

### Requirement: Datos compartidos del evento
Los datos comunes del evento (cartelera, compañía, contacto, teléfono) MUST editarse una vez y replicarse a todas las B.E.O. del evento, con posibilidad de sobrescribirlos en una B.E.O. concreta.

#### Scenario: Confirmar cartelera
- **WHEN** la asistente confirma la cartelera "GRAN ENCUENTRO NENA"
- **THEN** todas las B.E.O. del evento muestran esa cartelera como confirmada

### Requirement: Recordar correcciones
Al corregir un campo que provino de normalización, el sistema MUST ofrecer guardar la corrección como normalización aprendida.

#### Scenario: Recordar corrección de salón
- **WHEN** la asistente corrige un salón y marca "Recordar esta corrección"
- **THEN** la corrección queda disponible para futuros presupuestos

### Requirement: Unir o separar B.E.O.
La asistente MUST poder unir dos B.E.O. propuestas del mismo día o separar una en dos, sin perder las ediciones realizadas.

#### Scenario: Separar una B.E.O.
- **WHEN** la asistente separa una B.E.O. que agrupaba dos salones
- **THEN** quedan dos B.E.O., cada una con las líneas de su salón

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

### Requirement: Registrar B.E.O. corregida como caso dorado
La asistente MUST poder adjuntar, para un evento, la B.E.O. correcta en .docx o PDF y marcarla como caso dorado candidato, para que el equipo técnico la incorpore a la suite de regresión.

#### Scenario: Reportar diferencia
- **WHEN** la asistente detecta una diferencia y adjunta su B.E.O. corregida
- **THEN** el evento queda marcado como caso dorado candidato con el presupuesto y la B.E.O. de referencia

### Requirement: Validación de valores leídos por OCR
En eventos originados en un escaneo, cada valor leído por OCR MUST mostrarse con estado "validar" junto al recorte de la imagen de donde se leyó, excepto los montos de fila que no generan alerta. Los datos de cabecera y del cliente MUST quedar siempre para validar. Las alertas de montos MUST mostrarse en la revisión de presupuestos digitales y escaneados, sin bloquear la generación.

#### Scenario: Nombre de la ejecutiva
- **WHEN** el OCR lee "Jeamette García" en la cabecera
- **THEN** el campo aparece para validar con el recorte de la imagen al lado y la asistente lo corrige a "Jeannette García"

#### Scenario: Monto verificado
- **WHEN** el total de la fila "Asistentes de servicio" cuadra con cantidad por tarifa
- **THEN** el monto no requiere validación manual
