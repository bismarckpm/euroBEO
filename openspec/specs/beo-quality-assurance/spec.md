# beo-quality-assurance Specification

## Purpose

Casos dorados y pruebas de regresión de datos y visuales que garantizan que las B.E.O. generadas coinciden con las elaboradas correctamente por la asistente y que los errores reportados no reaparecen.

## Requirements

### Requirement: Casos dorados
El proyecto MUST mantener en `fixtures/golden/<caso>/` casos dorados formados por el PDF del presupuesto, los valores finales confirmados por la asistente, los datos esperados de cada B.E.O. (JSON) y la imagen de referencia de cada B.E.O. correcta. El primer caso MUST ser la cata de Laboratorio ELEAEXELTIS (B.E.O. 0.955/26).

#### Scenario: Caso de la cata
- **WHEN** se ejecuta la suite de regresión
- **THEN** el caso `cata-eleaexeltis` procesa el presupuesto, aplica los valores finales de la asistente y genera su B.E.O.

### Requirement: Comparación de datos
Para cada caso dorado, el sistema MUST comparar los datos de plantilla generados (`BeoTemplateData`) con el JSON esperado y la prueba MUST fallar mostrando los campos distintos.

#### Scenario: Personal mezclado
- **WHEN** el personal de evento de la cata aparece en el subgrupo Montaje
- **THEN** la prueba falla indicando la diferencia en `staff.service`

### Requirement: Comparación visual
Para cada caso dorado, el sistema MUST rasterizar el PDF generado y compararlo con la imagen de referencia, y la prueba MUST fallar si la diferencia supera el umbral configurado, guardando una imagen de diferencias.

#### Scenario: Fecha de preparación mal ubicada
- **WHEN** "Preparado el día" se imprime al pie en lugar del encabezado
- **THEN** la comparación visual falla y genera la imagen de diferencias

### Requirement: Ejecución obligatoria
La suite de casos dorados MUST ejecutarse dentro del contenedor de la aplicación como parte de `npm test` y ningún cambio MUST considerarse terminado con casos dorados fallando.

#### Scenario: Cambio que rompe un caso
- **WHEN** un cambio de código altera la B.E.O. de un caso dorado
- **THEN** `npm test` termina con error
