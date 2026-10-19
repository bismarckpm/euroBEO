# Proposal

## Why

Hoy la asistente decide a mano cuántas B.E.O. lleva un evento y copia cada dato del presupuesto a cada una. Con el presupuesto ya estructurado y normalizado, el sistema puede proponer automáticamente todas las B.E.O. del evento con sus campos llenos, aplicando las reglas de negocio confirmadas por el hotel.

## What Changes

- Motor de reglas que parte el evento en B.E.O. según RN-01, RN-02, RN-03, RN-12, RN-16, RN-17 y RN-18.
- Llenado de cada campo de la B.E.O. a partir del presupuesto: cabecera, fila del evento, garantía, renta, cartelera sugerida, A&B, secciones de la columna derecha, personal agrupado en Montaje/Evento/Desmontaje, instrucciones especiales y tipo de montaje.
- Montos precargados del presupuesto, siempre por unidad, editables después por la asistente.
- Estado por campo (Regla, IA, Pendiente) heredado del presupuesto o asignado por el motor.
- Persistencia de la propuesta como borrador del evento.

Fuera de alcance: hoja de precios, conversión de tarifas, desglose de combos de A&B, verificación de una página (la hace `add-document-generation`).

## Capabilities

### New Capabilities
- `beo-proposal`: partición del evento en B.E.O. y llenado automático de sus campos desde el presupuesto.

### Modified Capabilities

## Impact

Módulo puro `src/core/beo` (reglas y mapeo), modelos `Beo`, `BeoField`, `BeoLine`, ruta para generar la propuesta de un evento. Lo consumen la revisión y la generación de documentos.
