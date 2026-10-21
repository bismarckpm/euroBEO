# Proposal

## Why

Con el presupuesto "Cata Laboratorio ELEAEXELTIS" (Zafiro, 23/10/2026) el sistema generó una B.E.O. distinta a la que elaboró la asistente (B.E.O. 0.955/26):

- "Preparado el día" quedó al pie y las iniciales JG/AR dentro de "Aprobado por".
- Alimentos y Bebidas quedó vacío y la comida apareció en una sección "PENDIENTE" impresa en el documento, porque la ejecutiva tituló la sección "CENA CONFERENCIA" y ese encabezado no estaba mapeado.
- El personal de montaje y el de evento quedaron juntos bajo "Montaje", porque el subgrupo se tomó del bloque (MONTAJE) y no del encabezado de cada sección.
- El A&B no muestra "N° pax" ni "Precio: USD x c/u x pax".
- La columna EVENTO dice "Montaje" en lugar de "CATA".

Son fallas de plantilla, de mapeo y de control previo, no del parser. Este change las corrige y agrega una red de pruebas (casos dorados) para que no vuelvan a aparecer.

## What Changes

- Plantilla de B.E.O. reconstruida sobre el .docx de referencia de la asistente, con posiciones fijas (número y fecha de preparación arriba a la derecha, iniciales fuera de la tabla).
- Contrato de datos estructurado para A&B (título, líneas, "Incluye", nota, N° pax, precio unitario) y para personal (Montaje, Servicio Evento, Desmontaje); el formato lo aplica la plantilla.
- Clasificación por ítem con orden de prioridad y respaldo para encabezados desconocidos.
- Subgrupo de personal tomado del encabezado de su sección (modifica `beo-proposal`).
- Columna EVENTO deducida del contenido del día y del título del evento.
- Validación previa al render: "Pendiente" nunca se imprime y se bloquea la generación con datos incompletos (modifica `event-review`).
- Ajustes de presentación configurables (fuente del campo EVENTO, formato de fecha, mayúsculas, etiquetas de subgrupos, tipos de evento) y cálculo opcional de mesas.
- Casos dorados: presupuesto + B.E.O. correcta de la asistente, comparados por datos y visualmente en cada ejecución de pruebas.
- Opción en la revisión para registrar una B.E.O. corregida como nuevo caso dorado.

Fuera de alcance: hoja de precios y conversión de tarifas (siguen siendo ajuste manual), desglose de combos de A&B.

## Capabilities

### New Capabilities
- `beo-quality-assurance`: casos dorados y pruebas de regresión de datos y visuales de las B.E.O. generadas.

### Modified Capabilities
- `beo-proposal`: subgrupo de personal por encabezado de sección; clasificación por ítem con respaldo; A&B estructurado; deducción de la columna EVENTO; cálculo de mesas.
- `document-generation`: plantilla de referencia con posiciones fijas; formato de A&B en plantilla; validación previa al render.
- `event-review`: bloqueo de generación por datos incompletos; registro de B.E.O. corregidas como casos dorados.
- `configuration`: ajustes de presentación de la B.E.O. y catálogo de tipos de evento.

## Impact

`src/core/beo` (clasificación, personal, A&B, columna EVENTO), `src/core/documents` (contrato `BeoTemplateData`, validación previa), `templates/beo.docx` (reconstruida), `src/core/config` (ajustes de presentación), pantalla de revisión, carpeta `fixtures/golden/` y nueva suite de regresión visual. Operativo: configurar el correlativo con el último número real (la prueba salió como 0.010/26 en lugar de 0.955/26).
