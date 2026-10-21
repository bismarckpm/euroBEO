# Despliegue

Checklist del entorno del hotel. No forma parte de la suite automática.

- [ ] El correlativo de la B.E.O. está configurado con el último número real emitido. No usar 955: ese número es el de un caso de prueba, no el último de la operación.
- [ ] La base PostgreSQL del hotel está migrada (`npx prisma migrate deploy`).
- [ ] El usuario de la asistente existe (`npm run seed:user`) y la contraseña no está en el repositorio.
- [ ] Las variables de entorno (`DATABASE_URL`, `SESSION_SECRET`, Drive y la clave de IA si se usa) están fuera del código.
- [ ] LibreOffice en el contenedor es 7.4.7.2 40(Build:2) y `pdftoppm` está disponible. Con esa versión se aprobaron las líneas base. Si se actualiza LibreOffice, hay que regenerarlas y aprobarlas en el mismo cambio.
- [ ] La carpeta de Google Drive del año en curso es la que usa la asistente.

## Líneas base visuales

La comparación de imagen usa un umbral del 1 % contra una línea base generada por el propio sistema dentro del contenedor, no contra el PDF del hotel. Los PDF del hotel quedan en `fixtures/golden/<caso>/hotel-reference/` como documentación.

Actualizar una línea base es un acto deliberado. Se hace cuando la salida correcta de la app cambió (plantilla, textos o maquetación) o cuando cambia la versión de LibreOffice. No se regenera para tapar un fallo.

1. Dentro del contenedor, generar la revisión: `npm run golden:baseline -- <caso>`.
2. Una persona revisa los PDF de `fixtures/golden/<caso>/review/`: estructura, posiciones, montos y textos.
3. Si están bien, aprobar en el mismo contenedor: `npm run golden:baseline -- <caso> --approve "<nombre>" --reason "<motivo>"`.
4. Eso copia los raster a `baseline/<numero>.png` y escribe `baseline.json` con commit, fecha, versión de LibreOffice, motivo y aprobador.

El comando falla fuera del contenedor y si LibreOffice no es la serie 7.4. Las pruebas nunca escriben líneas base. Un caso activo sin línea base hace fallar la suite. `scan-calox` está pendiente porque no hay B.E.O. emitida.

## Revisión en Google Docs

El 21/10/2026 la asistente abrió en Google Docs la B.E.O. 0.955 generada (`fixtures/golden/cata-eleaexeltis/review/0.955.docx`). Confirmó que se ve bien y que se edita perfectamente.
