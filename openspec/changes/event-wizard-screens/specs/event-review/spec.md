# Spec Delta

## ADDED Requirements

### Requirement: Pantallas separadas del asistente
Crear o abrir un evento MUST recorrer pantallas separadas, en orden: presupuesto, datos del evento, B.E.O. pendientes, memorándum si le falta algo, generar y archivos. Esas pantallas MUST NOT mostrarse a la vez.

#### Scenario: Después del presupuesto
- **WHEN** la asistente guarda el PDF del Congreso de Reumatología al crear el evento
- **THEN** ve la pantalla de datos del evento y no ve los campos de una B.E.O. ni los botones de generar

#### Scenario: Reabrir con un pendiente
- **WHEN** la asistente abre un evento cuya única pendiente es la B.E.O. de Topacio
- **THEN** se abre la pantalla de esa B.E.O. y no la de generar

### Requirement: Una B.E.O. por pantalla
La pantalla de una B.E.O. MUST mostrar solo esa B.E.O.: sus campos, sus líneas y la ventana para agregar una línea. Anterior y Siguiente MUST cambiar de pantalla, y Siguiente MUST saltar las que ya están en cero. Unir, separar y el caso dorado MUST seguir en esa pantalla.

#### Scenario: Siguiente salta una en cero
- **WHEN** Plaza Caracas no tiene pendientes y «Por definir» del mismo día tiene uno, y la asistente pulsa Siguiente
- **THEN** se abre la pantalla de «Por definir» y no la de Plaza Caracas

#### Scenario: Agregar una línea en su pantalla
- **WHEN** la asistente, en la pantalla de una B.E.O., confirma cantidad 2, descripción «Agua» y precio 3,00
- **THEN** la línea queda en esa B.E.O. y la pantalla sigue siendo solo esa B.E.O.

### Requirement: Memorándum en su pantalla
Si el memorándum tiene pendientes o errores, MUST mostrarse en su propia pantalla antes de generar. Si está en cero, esa pantalla MUST saltarse.

#### Scenario: Memorándum pendiente
- **WHEN** las B.E.O. están en cero y el memorándum de estacionamiento tiene un campo pendiente
- **THEN** la siguiente pantalla es la del memorándum y todavía no es la de generar

#### Scenario: Memorándum en cero
- **WHEN** el memorándum no tiene pendientes ni errores y la asistente termina la última B.E.O.
- **THEN** la siguiente pantalla es la de generar

### Requirement: Tabla en su pantalla
Al terminar de generar, el sistema MUST abrir una pantalla con una fila por archivo: evento, número, lugar, fecha y contenido. El contenido MUST distinguir montaje, evento, desmontaje, sistemas y memorándum. Esa pantalla MUST NOT mostrar el editor de la B.E.O.

#### Scenario: Varios archivos
- **WHEN** se generan B.E.O. de montaje, evento y desmontaje, más una hoja de Sistemas
- **THEN** la pantalla de archivos tiene una fila por archivo, con su lugar, su fecha y su contenido

## MODIFIED Requirements

### Requirement: Lista de documentos del evento
El asistente MUST mostrar el avance de las B.E.O. propuestas (día, salón, tipo) y de los memorándums, con el número de pendientes de cada uno. Una B.E.O. con pendientes o error MUST llevar la marca «Revisar». La pantalla abierta MUST mostrar un solo paso.

#### Scenario: Evento con varias B.E.O.
- **WHEN** la asistente abre el asistente del Congreso de Reumatología
- **THEN** el avance lista 6 B.E.O. ordenadas por fecha y salón, con su contador, y la pantalla muestra solo el paso actual

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
- **THEN** el campo se muestra resaltado, no suma al contador de pendientes y las acciones de generar siguen habilitadas si no hay otro pendiente

### Requirement: Datos compartidos del evento
Los datos comunes del evento (cartelera, compañía, contacto, teléfono) MUST editarse en su propia pantalla, antes de cualquier B.E.O., y MUST replicarse a todas las B.E.O. del evento. Una B.E.O. concreta MUST poder sobrescribirlos en su propia pantalla.

#### Scenario: Confirmar cartelera
- **WHEN** la asistente confirma la cartelera "GRAN ENCUENTRO NENA" en la pantalla de datos del evento
- **THEN** todas las B.E.O. del evento muestran esa cartelera como confirmada

#### Scenario: La pantalla de datos no mezcla B.E.O.
- **WHEN** la asistente está en la pantalla de datos del evento
- **THEN** no ve alimentos, personal ni las acciones de generar

### Requirement: Confirmar y generar
Generar MUST mostrarse en su propia pantalla, después de los datos, las B.E.O. y el memorándum que falte. Cuando no hay campos "Pendiente" ni errores de la validación previa, esa pantalla MUST ofrecer generar las B.E.O., generar el memorándum o generar ambos. Los campos "Sin dato" y "Validar" MUST NOT impedirlo ni sumar al contador. Cada acción MUST generar solo lo que nombra.

#### Scenario: Campos pendientes
- **WHEN** queda al menos un campo con estado "Pendiente" en el evento
- **THEN** las tres acciones están deshabilitadas, se muestra cuántos faltan y no aparecen en la pantalla de la B.E.O.

#### Scenario: Errores de validación
- **WHEN** un ítem de alimentos no tiene sección
- **THEN** las tres acciones están deshabilitadas y se señala el ítem y la B.E.O. afectada

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
- **WHEN** el evento de Calox tiene la garantía en "Sin dato" y ningún campo "Pendiente"
- **THEN** las tres acciones están habilitadas y la B.E.O. se genera con la garantía vacía

#### Scenario: OCR sin confirmar
- **WHEN** el escaneo de Calox tiene campos en "Validar" y ningún campo "Pendiente"
- **THEN** el contador queda en cero y generar las B.E.O. produce el documento

### Requirement: Validación de valores leídos por OCR
En eventos originados en un escaneo, cada valor leído por OCR MUST mostrarse resaltado con estado "Validar" junto al recorte de la imagen de donde se leyó, excepto los montos de fila que no generan alerta. Los datos de cabecera y del cliente MUST quedar en "Validar". Ese estado MUST NOT sumar al contador de pendientes ni bloquear las acciones de generar. Las alertas de montos MUST mostrarse en la revisión de presupuestos digitales y escaneados, sin bloquear la generación.

#### Scenario: Nombre de la ejecutiva
- **WHEN** el OCR lee "Jeamette García" en la cabecera
- **THEN** el campo aparece resaltado con el recorte de la imagen al lado y la asistente puede corregirlo a "Jeannette García" sin que ese campo impida generar

#### Scenario: Monto verificado
- **WHEN** el total de la fila "Asistentes de servicio" cuadra con cantidad por tarifa
- **THEN** el monto no requiere validación manual
