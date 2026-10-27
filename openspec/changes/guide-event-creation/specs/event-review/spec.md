# Spec Delta

## ADDED Requirements

### Requirement: Señal de pendiente en la lista
Cada B.E.O. de la lista MUST mostrar una señal visible cuando tenga campos por revisar o un error de validación, también si no es la B.E.O. abierta. Una B.E.O. sin pendientes ni errores MUST mostrarse sin esa señal.

#### Scenario: Otra B.E.O. tiene un pendiente
- **WHEN** la asistente está en Plaza Caracas, que no tiene pendientes, y la B.E.O. «Por definir» del mismo día tiene uno
- **THEN** la lista marca «Por definir» y no marca Plaza Caracas

### Requirement: Ventana para agregar una línea
«Agregar línea» MUST ser un botón. Al pulsarlo MUST abrir una ventana con cantidad, descripción y precio. La línea MUST crearse solo al confirmar, y MUST NOT crearse si falta la descripción. Cerrar la ventana MUST dejar la B.E.O. igual.

#### Scenario: Confirmar una línea nueva
- **WHEN** la asistente abre «Agregar línea», escribe cantidad 2, descripción «Agua» y precio 3,00, y confirma
- **THEN** la línea aparece en la sección y la ventana se cierra

#### Scenario: Cerrar sin confirmar
- **WHEN** la asistente abre la ventana y la cierra sin confirmar
- **THEN** no se agrega ninguna línea

### Requirement: Asistente del evento
Tras cargar el presupuesto, el asistente MUST guiar por cada B.E.O. que tenga pendientes o errores, mostrando la fecha, el lugar y el tipo. MUST permitir pasar a la siguiente y volver a la anterior. Cuando no quede ninguna, MUST mostrar generar las B.E.O., generar el memorándum y generar ambos. Esas acciones MUST permanecer deshabilitadas mientras quede un pendiente o un error.

#### Scenario: Queda una B.E.O. por revisar
- **WHEN** el presupuesto deja una sola B.E.O. con un campo en «Revisar»
- **THEN** el asistente abre esa B.E.O. y los tres botones de generar están deshabilitados

#### Scenario: Todo listo
- **WHEN** ninguna B.E.O. ni memorándum tiene pendientes ni errores
- **THEN** se habilitan generar las B.E.O., generar el memorándum y generar ambos

### Requirement: Tabla de archivos generados
Al terminar una generación, el sistema MUST mostrar una tabla con una fila por archivo: evento, número, lugar, fecha y contenido. El contenido MUST distinguir montaje, evento, desmontaje, sistemas y memorándum.

#### Scenario: Evento de varios lugares
- **WHEN** se generan las B.E.O. de un evento con montaje, evento y desmontaje en lugares distintos, y una hoja de Sistemas
- **THEN** la tabla tiene una fila por archivo, con su lugar, su fecha y si es montaje, evento, desmontaje o sistemas

## MODIFIED Requirements

### Requirement: Confirmar y generar
Cuando no hay campos «Pendiente» ni errores de la validación previa, el sistema MUST ofrecer generar las B.E.O., generar el memorándum o generar ambos. Los campos «Sin dato» y «Validar» MUST NOT impedirlo ni sumar al contador. Cada acción MUST generar solo lo que nombra.

#### Scenario: Campos pendientes
- **WHEN** queda al menos un campo con estado «Pendiente» en el evento
- **THEN** las tres acciones están deshabilitadas y se muestra cuántos faltan

#### Scenario: Errores de validación
- **WHEN** un ítem de alimentos no tiene sección
- **THEN** las tres acciones están deshabilitadas y la revisión señala el ítem y la B.E.O. afectada

#### Scenario: Evento completo
- **WHEN** no quedan pendientes ni errores y la asistente pulsa generar ambos
- **THEN** se generan las B.E.O. y los memorándums del evento

#### Scenario: Solo las B.E.O.
- **WHEN** no quedan pendientes ni errores y la asistente pulsa generar las B.E.O.
- **THEN** se generan las B.E.O. y no se genera el memorándum

#### Scenario: Solo el memorándum
- **WHEN** no quedan pendientes ni errores y la asistente pulsa generar el memorándum
- **THEN** se genera el memorándum y no se generan las B.E.O.

#### Scenario: Solo campos sin dato
- **WHEN** el evento de Calox tiene la garantía en «Sin dato» y ningún campo «Pendiente»
- **THEN** las tres acciones están habilitadas y la B.E.O. se genera con la garantía vacía

#### Scenario: OCR sin confirmar
- **WHEN** el escaneo de Calox tiene campos en «Validar» y ningún campo «Pendiente»
- **THEN** el contador queda en cero y generar las B.E.O. produce el documento
