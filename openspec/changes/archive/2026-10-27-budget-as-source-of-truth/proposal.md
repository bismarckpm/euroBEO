# Proposal

## Why

El presupuesto es la verdad de lo que se vendió. Hoy el sistema exige datos y estructuras que un evento puede no tener:

- El lugar debe existir en el catálogo de salones, aunque el hotel alquila cualquier espacio (stands, piscinas, habitaciones, canchas, áreas del lobby). "Stand Calox" quedó pendiente.
- Un dato que el presupuesto no trae (por ejemplo, pax "...") queda "Pendiente" y bloquea la generación.
- La cartelera queda "Pendiente" hasta que la asistente la confirme.
- La validación previa exige precio en cada ítem de alimentos, y la carga exige cabecera y sección de totales.

Un evento puede no tener comida, bebida, personal, seguridad ni cualquier otro servicio. La app no debe exigir nada que no se vendió: debe reflejar lo que hay y señalar solo lo que vino en el presupuesto y no se pudo leer o ubicar.

## What Changes

- Principio general: la B.E.O. contiene solo lo que trae el presupuesto; secciones y campos sin datos se omiten o quedan vacíos sin bloquear.
- Nuevo estado "Sin dato" para lo que el presupuesto no trae: vacío y sin bloqueo. "Pendiente" queda solo para lo que vino y no se pudo interpretar, leer o clasificar.
- El lugar del evento se toma del texto del presupuesto, sea cual sea el espacio; el catálogo de salones queda solo para unificar escrituras. La IA deja de intervenir en el lugar.
- La partición por día y lugar aplica a cualquier espacio.
- La cartelera se propone con el título del evento, editable y sin bloquear.
- La validación previa al render deja de exigir precio en los alimentos.
- La carga solo exige una tabla legible; cabecera y totales son opcionales.
- Los avisos «Ítem sin total» y «noches que no coinciden con las fechas» no bloquean la carga ni la generación.
- Lo leído por OCR en «Validar» sigue resaltado, pero no suma a pendientes ni bloquea «Confirmar y generar».
- El número del memorándum se propone desde el último emitido, editable, y no queda «Pendiente».
- Si los totales del escaneo y del digital no coinciden, la diferencia se muestra junto a las demás y la conciliación no falla.

Fuera de alcance: las alertas de montos (siguen como están), tipificar espacios.

## Capabilities

### New Capabilities

### Modified Capabilities
- `beo-proposal`: el presupuesto como única fuente; partición por día y lugar; cartelera sin bloqueo.
- `budget-ingestion`: lugar del evento; estado "Sin dato"; estructura mínima.
- `configuration`: catálogo de salones como unificación opcional; último número de memorándum.
- `text-normalization`: la IA no resuelve el lugar.
- `document-generation`: validación previa sin exigencias de contenido.
- `event-review`: estados Regla, IA, Pendiente, Sin dato y Validar; generar sin datos que no vinieron y sin exigir el clic de OCR.
- `memo-generation`: número propuesto desde el último memorándum emitido.

## Impact

`src/core/budget` (lugar, estado "Sin dato", estructura mínima), `src/core/config` (resolución de alias), `src/core/normalization` (sin candidatos de salón), `src/core/beo` (cartelera, secciones vacías), `src/core/documents` (validación previa), pantalla de revisión (nuevo estado), datos esperados de `scan-calox`. Reemplaza al change no aplicado `accept-any-event-space`.
