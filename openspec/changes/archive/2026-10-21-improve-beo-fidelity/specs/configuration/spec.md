# Spec Delta

## ADDED Requirements

### Requirement: Ajustes de presentación de la B.E.O.
El sistema MUST permitir configurar la fuente del campo EVENTO de la cabecera (cliente o título del evento), el formato de la fecha de la fila (dd/mm/aa o dd.mm.aaaa), el uso de mayúsculas en día y contacto, las etiquetas de los subgrupos de personal y la activación del cálculo de mesas, y MUST aplicarlos en todas las B.E.O. generadas después del cambio.

#### Scenario: Fecha corta
- **WHEN** el formato configurado es dd/mm/aa
- **THEN** la fila de la B.E.O. de la cata muestra "23/10/26"

### Requirement: Catálogo de tipos de evento
El sistema MUST mantener un catálogo de tipos de evento con palabras clave (por ejemplo, CATA, CONGRESO, ALMUERZO, CÓCTEL, CENA, CELEBRACIÓN) usado para deducir la columna EVENTO de la B.E.O.

#### Scenario: Nuevo tipo
- **WHEN** la asistente agrega el tipo "LANZAMIENTO" con la palabra clave "lanzamiento"
- **THEN** un evento titulado "Lanzamiento de producto" obtiene EVENTO = "LANZAMIENTO"
