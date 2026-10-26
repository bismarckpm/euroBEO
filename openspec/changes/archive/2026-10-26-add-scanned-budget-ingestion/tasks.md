# Tasks

## 1. Caso dorado y punto de partida

- [x] 1.1 Copiar `fixtures/golden/scan-calox/` (escaneo, `expected-cells.json`) y el script de referencia a `docs/spikes/ocr-calox/`
- [x] 1.2 Prueba que procese el escaneo y compare contra `expected-cells.json`; debe fallar mientras la carga rechace PDF sin texto
- [x] 1.3 Guardar la salida en rojo en `openspec/changes/add-scanned-budget-ingestion/evidence/red-run.txt`

## 2. Servicio de OCR

- [x] 2.1 `services/ocr/` con FastAPI, OpenCV, Tesseract y `spa.traineddata` (tessdata_best); Dockerfile y servicio en `docker-compose.yml` solo en red interna
- [x] 2.2 Rasterizado a 300 dpi, enderezado y umbral adaptativo
- [x] 2.3 Detección de rejilla y clasificación de filas (celdas vs. ancho completo)
- [x] 2.4 OCR por celda (lista blanca en columnas numéricas) y por fila completa; OCR por zonas para cabecera, cliente y beneficios
- [x] 2.5 Salida de fragmentos con coordenadas, confianza y tipo; recortes guardados por fragmento
- [x] 2.6 Control de calidad mínima y detección de manuscritos
- [x] 2.7 Pruebas del servicio con el escaneo de Calox

## 3. Integración con el parser

- [x] 3.1 Interfaz `TextSource` común (pdfjs y OCR) y adaptador `ocr-source.ts`
- [x] 3.2 Carga: PDF sin texto → servicio de OCR; marca de origen "escaneo" en el evento; manejo de servicio caído
- [x] 3.3 Verificación aritmética reforzada (filas, subtotal, IVA, logística sobre A&B, total, IGTF) con sugerencia de corrección de un dígito
- [x] 3.4 Pruebas: caso Calox completo; dígito alterado artificialmente y sugerencia; todos los casos dorados digitales siguen en verde

## 4. Revisión y conciliación

- [x] 4.1 Estado "validar" para valores OCR, excepto números verificados; recorte de imagen junto al campo
- [x] 4.2 Advertencia de manuscritos con su recorte
- [x] 4.3 Conciliación al subir el PDF digital: diferencias y regeneración como nueva versión
- [x] 4.4 Prueba e2e: subir el escaneo de Calox, validar cabecera, generar B.E.O.

## 5. Corrección de perspectiva

La medición con fotos reales de celular queda fuera de este change, en `validate-phone-photo-ingestion`.

- [x] 5.2 Detección del contorno de la hoja y corrección de perspectiva, probada con imágenes sintéticas: rotar y deformar en perspectiva el raster del escaneo de Calox y comprobar que se recupera la tabla. Esas imágenes no validan fotos reales.

## 6. Cierre

- [x] 6.1 `docker compose run --rm app npm test` y `npm run test:e2e` en verde, sin saltos no declarados
- [ ] 6.2 Validación con la asistente usando el escaneo de Calox

## 7. Alertas de montos

- [x] 7.1 Alertas de fila, subtotal, IVA, total con logística impresa e IGTF, sin base de logística ni sugerencia de dígitos
- [x] 7.2 La carga no se bloquea por el cuadre; en la revisión se corrige el valor o se marca la alerta como revisada, y la generación sigue disponible
- [x] 7.3 Pruebas: fila descuadrada, IVA mal calculado, generación en ambos casos y Nena sin alerta de logística
