# Spec Delta

## Purpose

Interpretación de los textos libres del presupuesto que las reglas no resuelven, combinando normalizaciones aprendidas e IA, con enmascaramiento de datos del cliente y validación contra el catálogo.

## ADDED Requirements

### Requirement: Orden de resolución
Para cada campo con estado "Pendiente", el sistema MUST intentar primero la tabla de normalizaciones aprendidas, luego la IA, y si ninguna resuelve, MUST dejar el campo "Pendiente" para la asistente.

#### Scenario: Normalización aprendida
- **WHEN** un texto ya fue confirmado antes por la asistente
- **THEN** se aplica el resultado guardado con estado "Regla" sin llamar a la IA

#### Scenario: IA no disponible
- **WHEN** no hay clave de OpenAI configurada o la API no responde
- **THEN** el campo queda "Pendiente" y el proceso continúa

### Requirement: Enmascaramiento de datos del cliente
Antes de enviar cualquier texto a la IA, el sistema MUST reemplazar empresa, persona de contacto, teléfonos, correos, RIF y dirección por marcadores, MUST eliminar los montos y MUST enviar solo el fragmento necesario, nunca el presupuesto completo.

#### Scenario: Fragmento con datos del cliente
- **WHEN** un texto a normalizar contiene "Droguería Nena" y "(0412) 5243150"
- **THEN** el texto enviado contiene "[CLIENTE]" y "[TELEFONO]" en su lugar

#### Scenario: Montos excluidos
- **WHEN** el fragmento contiene "USD 4.500,00"
- **THEN** el texto enviado no contiene el monto

### Requirement: Salida estructurada y validada
El sistema MUST pedir a la IA una salida con esquema JSON cerrado por tipo de tarea y MUST validarla con Zod y contra el catálogo; si la validación falla, el campo MUST quedar "Pendiente".

#### Scenario: Salón fuera de catálogo
- **WHEN** la IA devuelve un salón que no existe en el catálogo
- **THEN** la respuesta se descarta y el campo queda "Pendiente"

#### Scenario: Horario válido
- **WHEN** la IA interpreta "Hora: 08:00 a 06:00 pm" como 08:00 a 18:00
- **THEN** el horario se guarda con estado "IA"

### Requirement: Aprendizaje por confirmación
Cuando la asistente confirma o corrige un campo con estado "IA" o "Pendiente", el sistema MUST ofrecer guardar el resultado como normalización aprendida asociada al texto original.

#### Scenario: Guardar corrección
- **WHEN** la asistente corrige el salón de "SALON PLAZA CARACAS" a "Diamante" y acepta guardarlo
- **THEN** la próxima vez ese texto se resuelve como "Diamante" sin llamar a la IA

### Requirement: Registro de llamadas a la IA
El sistema MUST registrar cada llamada con el fragmento enmascarado enviado, la respuesta recibida, el resultado de la validación y la fecha, y MUST permitir consultarlo.

#### Scenario: Auditoría de envío
- **WHEN** la asistente abre el registro de IA
- **THEN** ve exactamente el texto enviado, sin datos del cliente

### Requirement: Administración de normalizaciones
El sistema MUST permitir listar, editar y desactivar normalizaciones aprendidas, mostrando texto original, resultado y fecha.

#### Scenario: Desactivar una normalización errónea
- **WHEN** la asistente desactiva una normalización
- **THEN** ese texto vuelve a pasar por la IA en el siguiente presupuesto
