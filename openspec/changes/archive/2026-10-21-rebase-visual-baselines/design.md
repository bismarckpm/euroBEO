# Design

## Context

- Referencias actuales: raster a 100 dpi de `beo-asistente.pdf` (cata) y `beo-0.933.pdf` (Reumatología), producidos por Skia/PDF (Google Docs Renderer m157/m158), con TimesNewRomanPSMT, ArialMT y Arial-BoldMT.
- Salida del sistema: LibreOffice 7.4 en el contenedor; la plantilla pide Arial y fontconfig la resuelve como Liberation Sans.
- Los datos (`BeoTemplateData`) de la cata, Reumatología y Nena coinciden con el JSON esperado; las pruebas e2e pasan.

## Goals / Non-Goals

**Goals:**
- Suite en verde y significativa: cualquier cambio no deseado en la salida de la app debe fallar.
- Que actualizar una línea base sea un acto deliberado y trazable.

**Non-Goals:**
- Fidelidad píxel a píxel con Google Docs o Word.

## Decisions

- **Línea base por B.E.O.** en `fixtures/golden/<caso>/baseline/<numero>.png` (raster 100 dpi del PDF generado en el contenedor), con `baseline.json`: `{ commit, fecha, libreofficeVersion, motivo, aprobadoPor }`.
- **Aprobación previa.** El comando genera la línea base y el PDF correspondiente en una carpeta de revisión; solo al confirmar con `--approve "<nombre>" --reason "<motivo>"` se copia a `baseline/` y se registra en `baseline.json`. Alternativa: aceptar automáticamente la primera generación; se descarta porque fijaría como correcto cualquier error existente.
- **Solo dentro del contenedor.** El comando verifica la versión de LibreOffice esperada y falla fuera del contenedor, para que todas las líneas base salgan del mismo renderizador que la prueba.
- **Determinismo.** Los casos dorados toman número, fecha de preparación y valores ajustados de `final-values.json`; ningún dato depende de la fecha actual.
- **Manifiesto** (`fixtures/golden/manifest.json`): por caso, `status: active | pending` y motivo si está pendiente. La prueba falla si un caso activo no tiene línea base; los pendientes se listan en la salida.
- **Referencias del hotel** movidas a `hotel-reference/` sin uso en pruebas; se mantienen para revisión humana y como origen de `final-values.json`.
- **Límite del 1 %** sin cambios: entre dos salidas del mismo renderizador, cualquier diferencia mayor es un cambio real.

## Risks / Trade-offs

- Una línea base aprobada con un defecto lo fija como correcto. Mitigación: revisión humana del PDF antes de aprobar; el motivo y el aprobador quedan registrados.
- Actualizar LibreOffice en la imagen Docker puede cambiar el dibujo y romper todas las líneas base. Mitigación: versión fijada en el Dockerfile; al actualizarla, regenerar y aprobar líneas base en el mismo change.
