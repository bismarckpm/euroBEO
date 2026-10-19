# memo-generation Specification

## Purpose

Propuesta y generación de los memorándums de un evento (en el MVP, el de tarifa plana de estacionamiento) a partir de sus B.E.O. confirmadas, con el formato original del hotel.

## Requirements

### Requirement: Propuesta por disparador
Cuando el presupuesto contiene el disparador configurado de un tipo de memorándum, el sistema MUST proponer ese memorándum en la revisión del evento.

#### Scenario: Tarifa plana en beneficios
- **WHEN** el presupuesto de Gran Encuentro Nena incluye "Se otorga tarifa plana de estacionamiento" en BENEFICIOS
- **THEN** la revisión del evento muestra un memorándum de tarifa de estacionamiento propuesto

#### Scenario: Sin disparador
- **WHEN** el presupuesto no menciona tarifa plana de estacionamiento
- **THEN** no se propone ningún memorándum

### Requirement: Memorándum manual
La asistente MUST poder agregar manualmente un memorándum de cualquier tipo configurado a un evento, aunque el presupuesto no tenga disparador.

#### Scenario: Solicitud del ejecutivo
- **WHEN** el ejecutivo pide el memo de estacionamiento y el presupuesto no lo menciona
- **THEN** la asistente lo agrega y el sistema lo llena con los datos de las B.E.O.

### Requirement: Un memorándum con todos los días
El sistema MUST generar un solo memorándum por tipo y evento, con todos los días del evento y los salones tomados de las B.E.O. confirmadas.

#### Scenario: Evento de cinco días
- **WHEN** el evento tiene B.E.O. del 15 al 19 de octubre
- **THEN** el memorándum lista los cinco días en un solo documento

#### Scenario: Consistencia de salón
- **WHEN** la B.E.O. confirmada indica el salón Plaza Venezuela
- **THEN** el memorándum indica Plaza Venezuela

### Requirement: Contenido desde configuración y perfil
El memorándum MUST tomar destinatario, empresa, referencia y cuerpo de la configuración del tipo, y el firmante (nombre y cargo) del perfil de la usuaria.

#### Scenario: Firmante
- **WHEN** la usuaria tiene cargo "Asistente de Ventas"
- **THEN** el memorándum muestra su nombre y ese cargo en el campo DE

### Requirement: Generación con la plantilla original
El sistema MUST generar el memorándum en .docx editable y PDF llenando la plantilla original del hotel, y MUST incluirlo en la descarga del evento.

#### Scenario: Archivos del memo
- **WHEN** se confirma y genera un evento con memo de estacionamiento
- **THEN** el memo queda disponible en .docx y PDF junto con las B.E.O.

### Requirement: Aviso por cambios en B.E.O.
Si una B.E.O. de un evento se regenera, el sistema MUST indicar qué memorándums del evento podrían verse afectados y MUST permitir regenerarlos como nueva versión.

#### Scenario: Cambio de salón
- **WHEN** la asistente regenera una B.E.O. cambiando el salón
- **THEN** el sistema avisa que el memo de estacionamiento puede estar desactualizado y ofrece regenerarlo
