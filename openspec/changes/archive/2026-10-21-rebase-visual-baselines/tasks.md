# Tasks

## 1. Estructura y comando

- [x] 1.1 Mover los PDF e imágenes del hotel de cada caso a `fixtures/golden/<caso>/hotel-reference/` (cata y Reumatología); dejar intacto `final-values.json`
- [x] 1.2 Crear `fixtures/golden/manifest.json` con los casos y su estado (cata, Reumatología y Nena activos; `scan-calox` pendiente: sin B.E.O. emitida)
- [x] 1.3 Script `scripts/golden-baseline.ts` (`npm run golden:baseline`): genera PDF y raster en una carpeta de revisión; con `--approve` y `--reason` copia a `baseline/` y escribe `baseline.json`; falla fuera del contenedor
- [x] 1.4 Asegurar generación determinista desde `final-values.json` (número, fecha de preparación, valores ajustados)
- [x] 1.5 Pruebas del script: rechazo fuera del contenedor, rechazo sin aprobador o motivo, registro completo en `baseline.json`

## 2. Prueba visual

- [x] 2.1 `golden.test.ts`: comparar contra `baseline/<numero>.png`; fallar si falta la línea base de un caso activo; listar pendientes; nunca escribir líneas base
- [x] 2.2 Mantener el límite del 1 % y la imagen de diferencias

## 3. Líneas base iniciales

- [x] 3.1 Generar en el contenedor las líneas base de la cata, Reumatología 0.933 a 0.938 y Nena 0.928
- [x] 3.2 Revisar los PDF generados (estructura, posiciones, montos y textos visibles) y aprobarlos con aprobador y motivo
- [x] 3.3 `docker compose run --rm app npm test` y `npm run test:e2e` en verde, sin pendientes no declarados

## 4. Documentación y verificación

- [x] 4.1 Quitar "Fallos visuales conocidos" de `docs/despliegue.md` y documentar el procedimiento para actualizar líneas base (cuándo, quién aprueba, qué registrar)
- [x] 4.2 Dejar constancia en `docs/despliegue.md` de la versión de LibreOffice fijada y de que al actualizarla se regeneran y aprueban las líneas base
- [x] 4.3 Revisión manual con la asistente: abrir en Google Docs una B.E.O. generada y confirmar que se ve y edita bien; registrar el resultado en `docs/despliegue.md`

## Hallazgos durante la verificación

- Aislamiento de e2e: la suite usa la base `eurobeo_e2e`, distinta de la de desarrollo. Al empezar, `e2e/global-setup.ts` la crea si falta y vacía el esquema antes de migrar y sembrar el usuario y la configuración. Una corrida no hereda campos ni documentos de la anterior.
- Semilla de la plantilla: `prisma/seed-config.ts` activa `templates/beo.docx` si no hay una plantilla vigente. Sin eso, una base limpia no tenía plantilla y la prueba de historial se saltaba.
- RN-19: la garantía vacía de una B.E.O. de montaje sin pax (Reumatología, 22/10, Zafiro) nace en Regla, origen `rule:rn-19`. No nace en Pendiente. Quedó fijado con una prueba unitaria y con la propuesta del presupuesto de ejemplo.
- Confirmar y generar: el clic espera a que terminen los guardados en curso y solo entonces genera. No se deshabilita el botón al guardar un campo, para no perder el clic. La prueba edita un precio y pulsa generar de inmediato; la B.E.O. generada lleva el precio nuevo.
- Nena: las tres líneas sin sección eran Supervisor, Limpiador / Acomodador y Oficial de seguridad, en el desmontaje del 22/10 sin encabezado de sección. El catálogo no las tenía (la coincidencia es exacta) y el respaldo por palabras no reconoce esos oficios. Quedaron en el catálogo como Personal y el subgrupo sale del tipo de bloque. La prueba del memo ya no las quita. Una línea que siga sin sección bloquea la generación, y «Pendiente» no se imprime. Los datos esperados de Nena incluyen esas tres líneas de desmontaje. La comparación visual siguió dentro del 1 %; no se regeneraron las imágenes de referencia.
- Playwright usa `trace: 'retain-on-failure'`. `docker-compose.yml` monta `./test-results` en `/app/test-results`, así el rastro queda en el host cuando el contenedor se elimina.
