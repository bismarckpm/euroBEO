# Proposal

## Why

Cuando el presupuesto otorga tarifa plana de estacionamiento, la asistente redacta a mano un memorándum para Servicios Parking. En la muestra, el memo 75 indicó un salón distinto al de la B.E.O. del mismo evento. Generarlo desde las B.E.O. confirmadas elimina el trabajo manual y esa inconsistencia.

## What Changes

- Propuesta automática del memorándum de estacionamiento cuando el presupuesto tiene el disparador (BENEFICIOS o cláusulas).
- Opción de agregar manualmente un memorándum solicitado por el ejecutivo.
- Un solo memorándum por evento con todos los días y salones tomados de las B.E.O. (RN-09).
- Generación en .docx y PDF desde la plantilla original del memo, con firmante desde el perfil de la usuaria.
- Aviso de memos afectados si se regenera una B.E.O.

Fuera de alcance: otros tipos de memorándum (la configuración permite agregarlos después sin desarrollo de reglas nuevas).

## Capabilities

### New Capabilities
- `memo-generation`: propuesta, revisión y generación de memorándums asociados a las B.E.O. de un evento.

### Modified Capabilities

## Impact

Módulo `src/core/memo`, modelos `Memo` y su relación con `GeneratedDocument`, plantilla .docx del memo en `templates/`. Reutiliza el motor de render y conversión de `add-document-generation`.
