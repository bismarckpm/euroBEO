# Spec Delta

## Purpose

Catálogos y textos configurables (salones, secciones, ítems, textos fijos, memorándums y correlativo) que permiten interpretar presupuestos y llenar documentos sin valores fijos en el código.

## ADDED Requirements

### Requirement: Catálogo de salones con alias
El sistema MUST mantener un catálogo de salones con nombre oficial y alias, y MUST resolver cualquier texto de salón del presupuesto a su nombre oficial ignorando mayúsculas, acentos y la palabra "salón".

#### Scenario: Resolver alias
- **WHEN** el presupuesto dice "Salon Plaza Real A y B" y existe el alias "Plaza Real A y B"
- **THEN** el sistema resuelve el salón al nombre oficial configurado

#### Scenario: Salón desconocido
- **WHEN** un texto de salón no coincide con ningún nombre ni alias
- **THEN** el sistema lo marca como no resuelto para que lo atienda la normalización o la asistente

### Requirement: Mapeo de secciones del presupuesto
El sistema MUST mantener un mapeo de encabezados de sección del presupuesto (con variantes) a una sección destino de la B.E.O. o a "excluir".

#### Scenario: Variantes del mismo encabezado
- **WHEN** el presupuesto usa "PERSONAL PARA EL SERVICIO", "PERSONAL EVENTO" o "Personal"
- **THEN** todos se asignan a la sección PERSONAL

#### Scenario: Sección excluida
- **WHEN** el presupuesto incluye la sección "HABITACIÓN" y está mapeada a "excluir"
- **THEN** sus ítems no aparecen en ninguna B.E.O.

### Requirement: Catálogo de ítems
El sistema MUST mantener un catálogo de ítems frecuentes con su categoría y sección destino, usado para clasificar ítems cuando el encabezado de sección no basta.

#### Scenario: Filtros de agua en Bebidas
- **WHEN** aparece "Filtros de agua" bajo "ALIMENTOS Y BEBIDAS"
- **THEN** el ítem se clasifica en la sección BEBIDAS según el catálogo

### Requirement: Textos fijos editables
El sistema MUST permitir editar los textos fijos de la B.E.O. (instrucciones especiales, frase de preparación del servicio e iniciales del pie) y MUST usar siempre el valor vigente al generar.

#### Scenario: Cambio de instrucciones
- **WHEN** la asistente modifica el texto estándar de instrucciones especiales
- **THEN** las B.E.O. propuestas a partir de ese momento usan el nuevo texto

### Requirement: Configuración de tipos de memorándum
El sistema MUST permitir configurar tipos de memorándum con destinatario, empresa, referencia, cuerpo con variables (`{dias}`, `{evento}`, `{salones}`), palabras clave disparadoras y plantilla .docx. El MVP MUST incluir el tipo "Tarifa de estacionamiento".

#### Scenario: Tipo semilla
- **WHEN** se ejecuta la carga inicial de configuración
- **THEN** existe el tipo "Tarifa de estacionamiento" con la palabra clave "tarifa plana de estacionamiento"

### Requirement: Configuración del correlativo
El sistema MUST guardar el último número de B.E.O. emitido y su año, y MUST permitir que la asistente lo ajuste.

#### Scenario: Ajuste inicial
- **WHEN** la asistente indica que el último número emitido es 0.947/26
- **THEN** el próximo número propuesto es 0.948/26
