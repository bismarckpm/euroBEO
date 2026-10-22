# beo-quality-assurance Specification

## Purpose

Casos dorados y pruebas de regresión de datos y visuales que garantizan que las B.E.O. generadas coinciden con las elaboradas correctamente por la asistente y que los errores reportados no reaparecen.

## Requirements

### Requirement: Casos dorados
El proyecto MUST mantener en `fixtures/golden/<caso>/` casos dorados formados por el PDF del presupuesto, los valores finales confirmados por la asistente, los datos esperados de cada B.E.O. (JSON) y una línea base visual por B.E.O. generada por el propio sistema y aprobada por una persona. El primer caso MUST ser la cata de Laboratorio ELEAEXELTIS (B.E.O. 0.955/26).

#### Scenario: Caso de la cata
- **WHEN** se ejecuta la suite de regresión
- **THEN** el caso `cata-eleaexeltis` procesa el presupuesto, aplica los valores finales de la asistente y genera su B.E.O.

### Requirement: Comparación de datos
Para cada caso dorado, el sistema MUST comparar los datos de plantilla generados (`BeoTemplateData`) con el JSON esperado y la prueba MUST fallar mostrando los campos distintos.

#### Scenario: Personal mezclado
- **WHEN** el personal de evento de la cata aparece en el subgrupo Montaje
- **THEN** la prueba falla indicando la diferencia en `staff.service`

### Requirement: Comparación visual
Para cada caso dorado activo, el sistema MUST rasterizar el PDF generado y compararlo con su línea base aprobada, y la prueba MUST fallar si la diferencia supera el 1 % o si falta la línea base, guardando una imagen de diferencias.

#### Scenario: Fecha de preparación mal ubicada
- **WHEN** un cambio de código hace que "Preparado el día" se imprima al pie en lugar del encabezado
- **THEN** la comparación visual falla contra la línea base y genera la imagen de diferencias

#### Scenario: Salida sin cambios
- **WHEN** se ejecuta la suite sin cambios en la generación de documentos
- **THEN** la cata y Reumatología quedan por debajo del 1 % frente a sus líneas base

#### Scenario: Caso pendiente
- **WHEN** un caso está declarado como pendiente en el manifiesto, con su motivo
- **THEN** la comparación visual de ese caso no se ejecuta y la salida de la suite lo lista como pendiente

### Requirement: Referencias del hotel como documentación
Los PDF de B.E.O. elaborados por el hotel MUST conservarse en `fixtures/golden/<caso>/hotel-reference/` como documentación y fuente de los valores finales, y MUST NOT usarse en la comparación visual automática.

#### Scenario: Referencia del hotel fuera de la prueba
- **WHEN** se ejecuta la comparación visual de la cata
- **THEN** se compara contra la línea base aprobada del sistema y no contra el PDF de Google Docs de la asistente

### Requirement: Actualización controlada de líneas base
Las líneas base MUST generarse o actualizarse solo con un comando explícito ejecutado dentro del contenedor, que exija aprobador y motivo y registre commit, fecha y versión de LibreOffice. Las pruebas MUST NOT crear ni modificar líneas base.

#### Scenario: Aprobar una línea base
- **WHEN** se ejecuta `npm run golden:baseline -- cata-eleaexeltis --approve "Bismarck Ponce" --reason "Línea base inicial"` dentro del contenedor
- **THEN** se guarda la línea base y `baseline.json` registra aprobador, motivo, commit, fecha y versión de LibreOffice

#### Scenario: Fuera del contenedor
- **WHEN** se ejecuta el comando fuera del contenedor
- **THEN** el comando falla indicando que las líneas base solo se generan dentro del contenedor

#### Scenario: Prueba sin línea base
- **WHEN** la suite encuentra un caso activo sin línea base
- **THEN** la prueba falla y no genera la línea base por su cuenta

### Requirement: Ejecución obligatoria
La suite de casos dorados MUST ejecutarse dentro del contenedor de la aplicación como parte de `npm test` y ningún cambio MUST considerarse terminado con casos dorados fallando.

#### Scenario: Cambio que rompe un caso
- **WHEN** un cambio de código altera la B.E.O. de un caso dorado
- **THEN** `npm test` termina con error
