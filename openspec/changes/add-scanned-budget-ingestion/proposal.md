# Proposal

## Why

Con frecuencia el presupuesto llega como PDF escaneado: la ejecutiva imprime para revisar o el cliente devuelve la copia firmada, y se envía el escaneo antes que el digital. No se puede exigir el digital sin frenar el flujo. Hoy la app rechaza esos PDF.

Una prueba con un escaneo real (Calox International, "Coctel - Encuentro Nena", 150 dpi, escala de grises, con firma y sello) mostró que el OCR local por celdas lee correctamente todos los ítems y montos, y que todas las verificaciones aritméticas del presupuesto cuadran. El OCR de página completa, en cambio, pierde filas. El enfoque viable es OCR guiado por la rejilla de la tabla.

## What Changes

- Los PDF sin capa de texto dejan de rechazarse y pasan por una vía de escaneo.
- Servicio de OCR local (Python con OpenCV y Tesseract en español) dentro de Docker Compose: preprocesa, detecta la rejilla, lee celda por celda y devuelve fragmentos con coordenadas en el mismo formato que la lectura digital.
- El parser existente procesa esos fragmentos sin cambios de lógica.
- Verificación aritmética reforzada: filas, subtotal, IVA 16 %, logística 1 % sobre alimentos y bebidas, total e IGTF 3 %, con la celda exacta señalada si algo no cuadra.
- En la revisión, todo valor leído por OCR queda marcado para validar, con el recorte del escaneo al lado.
- Conciliación: si después se sube el PDF digital del mismo evento, se comparan y se regeneran solo las B.E.O. afectadas.
- Control de calidad mínima del escaneo (resolución y legibilidad).
- Preparado para fotos de celular (corrección de perspectiva), con su aceptación sujeta a muestras reales.

Fuera de alcance: OCR en la nube o con modelos de visión; lectura de anotaciones manuscritas (solo se detectan y se advierte).

## Capabilities

### New Capabilities
- `scanned-budget-ocr`: lectura de presupuestos escaneados o fotografiados mediante OCR local guiado por la plantilla.

### Modified Capabilities
- `budget-ingestion`: aceptación de PDF sin texto, verificación aritmética reforzada y conciliación con el PDF digital.
- `event-review`: validación de valores leídos por OCR con el recorte del escaneo.
- `platform-foundation`: nuevo servicio de OCR en Docker Compose.

## Impact

Nuevo servicio `ocr` (Python, FastAPI, OpenCV, Tesseract con `spa.traineddata`) en `services/ocr/` y en `docker-compose.yml`; adaptador `src/core/budget/ocr-source.ts`; ampliación de la verificación de totales; cambios en la pantalla de revisión; nuevo caso dorado `fixtures/golden/scan-calox/`. Depende de `fix-mixed-staff-headers` para que el caso dorado de Calox clasifique bien el personal.
