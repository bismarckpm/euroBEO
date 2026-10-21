# Tasks

## 1. Caso dorado y punto de partida

- [ ] 1.1 Copiar `fixtures/golden/scan-calox/` (escaneo, `expected-cells.json`) y el script de referencia a `docs/spikes/ocr-calox/`
- [ ] 1.2 Prueba que procese el escaneo y compare contra `expected-cells.json`; debe fallar mientras la carga rechace PDF sin texto
- [ ] 1.3 Guardar la salida en rojo en `openspec/changes/add-scanned-budget-ingestion/evidence/red-run.txt`

## 2. Servicio de OCR

- [ ] 2.1 `services/ocr/` con FastAPI, OpenCV, Tesseract y `spa.traineddata` (tessdata_best); Dockerfile y servicio en `docker-compose.yml` solo en red interna
- [ ] 2.2 Rasterizado a 300 dpi, enderezado y umbral adaptativo
- [ ] 2.3 Detección de rejilla y clasificación de filas (celdas vs. ancho completo)
- [ ] 2.4 OCR por celda (lista blanca en columnas numéricas) y por fila completa; OCR por zonas para cabecera, cliente y beneficios
- [ ] 2.5 Salida de fragmentos con coordenadas, confianza y tipo; recortes guardados por fragmento
- [ ] 2.6 Control de calidad mínima y detección de manuscritos
- [ ] 2.7 Pruebas del servicio con el escaneo de Calox

## 3. Integración con el parser

- [ ] 3.1 Interfaz `TextSource` común (pdfjs y OCR) y adaptador `ocr-source.ts`
- [ ] 3.2 Carga: PDF sin texto → servicio de OCR; marca de origen "escaneo" en el evento; manejo de servicio caído
- [ ] 3.3 Verificación aritmética reforzada (filas, subtotal, IVA, logística sobre A&B, total, IGTF) con sugerencia de corrección de un dígito
- [ ] 3.4 Pruebas: caso Calox completo; dígito alterado artificialmente y sugerencia; todos los casos dorados digitales siguen en verde

## 4. Revisión y conciliación

- [ ] 4.1 Estado "validar" para valores OCR, excepto números verificados; recorte de imagen junto al campo
- [ ] 4.2 Advertencia de manuscritos con su recorte
- [ ] 4.3 Conciliación al subir el PDF digital: diferencias y regeneración como nueva versión
- [ ] 4.4 Prueba e2e: subir el escaneo de Calox, validar cabecera, generar B.E.O.

## 5. Fotos de celular (requiere muestras reales)

- [ ] 5.1 Obtener 3 a 5 fotos de celular de presupuestos impresos de los que exista el PDF digital; guardarlas en `fixtures/photos/`
- [ ] 5.2 Detección del contorno de la hoja y corrección de perspectiva
- [ ] 5.3 Medir contra el digital: porcentaje de celdas numéricas correctas y presupuestos que cuadran sin intervención; documentar en `docs/spikes/ocr-fotos.md`
- [ ] 5.4 Ajustar umbrales según la medición; si la precisión no es aceptable, documentarlo y proponer un change aparte

## 6. Cierre

- [ ] 6.1 `docker compose run --rm app npm test` y `npm run test:e2e` en verde, sin saltos no declarados
- [ ] 6.2 Validación con la asistente usando el escaneo de Calox
