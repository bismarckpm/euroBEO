# Tasks

## 1. Estructura y comando

- [ ] 1.1 Mover los PDF e imágenes del hotel de cada caso a `fixtures/golden/<caso>/hotel-reference/` (cata y Reumatología); dejar intacto `final-values.json`
- [ ] 1.2 Crear `fixtures/golden/manifest.json` con los casos y su estado (cata, Reumatología y Nena activos; `scan-calox` pendiente: sin B.E.O. emitida)
- [ ] 1.3 Script `scripts/golden-baseline.ts` (`npm run golden:baseline`): genera PDF y raster en una carpeta de revisión; con `--approve` y `--reason` copia a `baseline/` y escribe `baseline.json`; falla fuera del contenedor
- [ ] 1.4 Asegurar generación determinista desde `final-values.json` (número, fecha de preparación, valores ajustados)
- [ ] 1.5 Pruebas del script: rechazo fuera del contenedor, rechazo sin aprobador o motivo, registro completo en `baseline.json`

## 2. Prueba visual

- [ ] 2.1 `golden.test.ts`: comparar contra `baseline/<numero>.png`; fallar si falta la línea base de un caso activo; listar pendientes; nunca escribir líneas base
- [ ] 2.2 Mantener el límite del 1 % y la imagen de diferencias

## 3. Líneas base iniciales

- [ ] 3.1 Generar en el contenedor las líneas base de la cata, Reumatología 0.933 a 0.938 y Nena 0.928
- [ ] 3.2 Revisar los PDF generados (estructura, posiciones, montos y textos visibles) y aprobarlos con aprobador y motivo
- [ ] 3.3 `docker compose run --rm app npm test` y `npm run test:e2e` en verde, sin pendientes no declarados

## 4. Documentación y verificación

- [ ] 4.1 Quitar "Fallos visuales conocidos" de `docs/despliegue.md` y documentar el procedimiento para actualizar líneas base (cuándo, quién aprueba, qué registrar)
- [ ] 4.2 Dejar constancia en `docs/despliegue.md` de la versión de LibreOffice fijada y de que al actualizarla se regeneran y aprueban las líneas base
- [ ] 4.3 Revisión manual con la asistente: abrir en Google Docs una B.E.O. generada y confirmar que se ve y edita bien; registrar el resultado en `docs/despliegue.md`
