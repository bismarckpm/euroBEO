# Proposal

## Why

La comparación visual de los casos dorados falla de forma permanente: la cata queda en 10,1 % de píxeles distintos y Reumatología 0.933 en 8,6 %, frente a un límite de 1 %. El diagnóstico mostró que no es un error de la app: las imágenes de referencia salen de PDF exportados desde Google Docs (Times New Roman y Arial), mientras el sistema genera con LibreOffice 7.4 (Liberation Sans en lugar de Arial). Dos programas distintos nunca dibujan igual píxel a píxel.

Por decisión del proyecto, esas diferencias de dibujo no son un problema: son detalles menores que la asistente resuelve a mano. Pero una suite que siempre falla termina ignorándose y deja de detectar regresiones reales. Este change convierte la comparación visual en lo que debe ser: un control de que la app no cambia su propia salida sin querer.

## What Changes

- La imagen de referencia de cada caso dorado pasa a ser una línea base generada por el propio sistema dentro del contenedor, revisada y aprobada por una persona antes de usarse.
- Los PDF del hotel (Google Docs) se conservan en `fixtures/golden/<caso>/hotel-reference/` como documentación y dejan de participar en la comparación automática.
- Comando explícito para generar o actualizar líneas base, solo dentro del contenedor, con registro de motivo, aprobador, commit y versión de LibreOffice. Las pruebas nunca regeneran líneas base por sí solas.
- Generación determinista de los casos dorados (número, fecha de preparación y demás valores fijados desde `final-values.json`).
- Se retira la nota de "Fallos visuales conocidos" de `docs/despliegue.md` y se documenta el procedimiento de actualización de líneas base.
- Revisión manual única: la asistente abre en Google Docs una B.E.O. generada y confirma que se ve y edita bien.

Fuera de alcance: igualar el dibujo de LibreOffice con Google Docs o Word, cambiar fuentes de la plantilla o del contenedor, modificar el límite del 1 %.

## Capabilities

### New Capabilities

### Modified Capabilities
- `beo-quality-assurance`: referencia visual = línea base aprobada generada por el sistema; actualización controlada de líneas base.

## Impact

`src/core/documents/golden.test.ts`, nuevo script `scripts/golden-baseline.ts` (`npm run golden:baseline`), estructura de `fixtures/golden/<caso>/` (`baseline/`, `baseline.json`, `hotel-reference/`), `fixtures/golden/manifest.json`, `docs/despliegue.md`. Sin cambios en la lógica de negocio ni en la plantilla.
