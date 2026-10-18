# Design

## Context

Única usuaria. Volumen esperado: decenas de eventos por mes (el correlativo avanzó de 0.830 a 0.947 en octubre de 2026).

## Goals / Non-Goals

**Goals:**
- Encontrar un evento en segundos.
- Regenerar solo lo que cambió, con trazabilidad.

**Non-Goals:**
- Restaurar versiones antiguas como vigentes (se pueden descargar, no reactivar).

## Decisions

- **Regeneración conserva el número** de la B.E.O. y crea una nueva versión (v2, v3…); el nombre en Drive lleva el sufijo.
- **Comparación de versiones** campo a campo a partir de los datos guardados (no del Word), mostrando solo los campos que cambiaron.
- **Anulación** marca la B.E.O. como anulada, conserva su número como usado y la excluye de la descarga del evento.
- **Búsqueda** con índices en cliente, título, fechas y localizador; paginación simple.

## Risks / Trade-offs

- Regenerar una B.E.O. puede dejar desactualizado el memo; se resuelve con el aviso definido en `add-parking-memo`.
