# Spec Delta

## ADDED Requirements

### Requirement: Plantilla de referencia con posiciones fijas
La plantilla de la B.E.O. MUST construirse sobre el .docx de referencia aprobado por la asistente, con el número de orden y "Preparado el día" en el encabezado superior derecho y las iniciales en un párrafo después de la tabla. El código MUST limitarse a llenar marcadores y MUST NOT agregar, mover ni eliminar bloques del documento.

#### Scenario: Encabezado
- **WHEN** se genera la B.E.O. de la cata
- **THEN** "ORDEN DE SERVICIO # No. 0.955/26" y "Preparado el día: 19/10/2026" aparecen arriba a la derecha y "JG/AR" debajo de la tabla

### Requirement: Formato de alimentos y bebidas en la plantilla
La plantilla MUST imprimir cada ítem de alimentos con el título en negrita, sus líneas de menú, "Incluye:" en negrita, la nota en negrita, "N° pax: {pax}" cuando exista y "Precio: USD {precio} c/u x pax"; y MUST imprimir los subgrupos de personal con sus etiquetas, omitiendo los vacíos.

#### Scenario: Ítem de pasapalos
- **WHEN** el ítem es "Pasapalos 01 p/p", "Shot de tequeño picamiel", 150 pax a 2,00
- **THEN** la columna Alimentos y Bebidas muestra el título, la línea del menú, "N° pax: 150" y "Precio: USD 2,00 c/u x pax"

### Requirement: Validación previa al render
Antes de generar, el sistema MUST validar los datos de cada B.E.O. y MUST bloquear la generación indicando B.E.O. y campo cuando: una línea no tiene sección, hay alimentos en el presupuesto pero la sección Alimentos y Bebidas está vacía, un ítem de alimentos no tiene precio, una línea de personal no tiene subgrupo, o algún texto a imprimir contiene el estado "Pendiente".

#### Scenario: Comida sin clasificar
- **WHEN** un ítem de comida quedó sin sección
- **THEN** no se genera el documento y se indica qué ítem y en qué B.E.O. falta clasificar
