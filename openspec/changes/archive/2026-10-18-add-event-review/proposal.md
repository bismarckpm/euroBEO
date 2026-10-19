# Proposal

## Why

El presupuesto no siempre refleja lo que finalmente se ejecuta: en la muestra cambian fechas, horarios, pax y menús después de aprobado, y hay datos que no están en el presupuesto (cartelera, precios de la hoja de precios). La asistente necesita una pantalla donde revise solo lo marcado, corrija lo que cambió y confirme, en lugar de redactar cada B.E.O.

## What Changes

- Pantalla de revisión del evento con la lista de B.E.O. y memorándums propuestos.
- Vista de cada B.E.O. con la misma disposición de la plantilla y estado visible por campo (Regla, IA, Pendiente).
- Contador de campos pendientes por B.E.O. y por evento.
- Edición de cualquier campo y de las líneas (agregar, quitar, cambiar cantidad, descripción o precio).
- Confirmación de sugerencias (cartelera) con réplica a todas las B.E.O. del evento.
- Unir o separar B.E.O. propuestas.
- Botón "Confirmar y generar" habilitado solo sin campos pendientes.

Fuera de alcance: aprobaciones o firmas dentro de la app, hoja de precios, reglas de desglose de A&B.

## Capabilities

### New Capabilities
- `event-review`: revisión, corrección y confirmación de las B.E.O. y memorándums propuestos de un evento.

### Modified Capabilities

## Impact

Páginas `/eventos/[id]/revision`, componentes de edición, rutas de actualización de campos y líneas, integración con el registro de auditoría y con el guardado de normalizaciones aprendidas.
