# Design

## Context

Hoy el único tipo de memorándum es "Tarifa de estacionamiento" (memos 75 y 82): destinatario fijo (Servicios Parking 2015 C.A.), referencia fija, cuerpo con días del evento, nombre del evento y salón, y firma de quien lo emite.

## Goals / Non-Goals

**Goals:**
- Memo consistente con las B.E.O. del mismo evento.
- Mismo nivel de fidelidad de formato que las B.E.O.

**Non-Goals:**
- Envío del memo por correo.

## Decisions

- **Fuente de datos = B.E.O. confirmadas**, no el presupuesto: días = fechas de las B.E.O. de evento (excluye días solo de montaje o desmontaje, a confirmar con el hotel; configurable), salones = salones de esas B.E.O. sin repetir, evento = cartelera confirmada.
- **Formato de días** en texto ("15, 16, 17, 18 y 19 de octubre de 2026") con utilidad en `src/lib/format.ts`.
- **Cuerpo** desde la configuración del tipo de memo con variables `{dias}`, `{evento}`, `{salones}`; destinatario, empresa y referencia desde la configuración; firmante = nombre y cargo del perfil.
- **Número del memo**: campo editable por la asistente (los archivos de muestra se numeran 75, 82), sin secuencia automática en el MVP.
- **Revisión** dentro de la misma pantalla del evento, con los mismos estados por campo.

## Risks / Trade-offs

- La exclusión de días de montaje es una suposición; queda como opción configurable del tipo de memo.
