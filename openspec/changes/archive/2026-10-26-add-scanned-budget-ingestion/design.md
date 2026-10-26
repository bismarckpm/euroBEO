# Design

## Context

Prueba de concepto sobre el escaneo de Calox (script de referencia en `docs/spikes/ocr-calox/`):

- PDF de 6 páginas, imagen JPEG en gris a 150 dpi, sin capa de texto; firma y sello fuera de la tabla.
- Rasterizado a 300 dpi, umbral adaptativo y detección de líneas con operaciones morfológicas: se detectaron 6 columnas (Cantidad, Descripción, Día, Moneda, Tarifa, Total) y todas las filas.
- OCR por celda (Tesseract `spa`, psm 7 con lista blanca `0123456789.,` en columnas numéricas; psm 6 en descripción): ítems, cantidades, tarifas, totales, subtotal (186,50), IVA (29,84), logística (0,50) y total (216,84) correctos.
- Errores observados: filas de encabezado de ancho completo cortadas por columnas; errores en cabecera (nombre de la ejecutiva, correo, RIF).

## Goals / Non-Goals

**Goals:**
- Procesar escaneos de multifuncional con la misma lectura numérica que un PDF digital, y avisar en la revisión cuando un monto no cuadra.
- No enviar el documento a servicios externos.
- Reutilizar el parser existente.

**Non-Goals:**
- Leer manuscritos.
- Garantizar desde ya la lectura de fotos de celular sin muestras reales.

## Decisions

- **Servicio Python separado** (`services/ocr`, FastAPI): OpenCV y Tesseract son más maduros en Python que en Node. Interfaz única: `POST /ocr` con el PDF → páginas con fragmentos `{ text, x, y, width, height, confidence, kind: cell|line|header }`. Alternativa: tesseract.js + opencv.js en Node; se descarta por rendimiento y madurez del preprocesamiento.
- **Pipeline por página:** rasterizar a 300 dpi → enderezar (detección de orientación de Tesseract y ángulo de las líneas horizontales) → para fotos, detectar el contorno de la hoja y corregir la perspectiva → umbral adaptativo → detectar rejilla (aperturas morfológicas horizontales y verticales) → clasificar filas: con líneas verticales = filas de celdas; sin ellas = filas de ancho completo (fechas, encabezados de bloque y sección) → OCR por celda o por fila completa → fuera de la tabla, OCR por zonas de la plantilla (cabecera, datos del cliente, beneficios).
- **Columnas numéricas** con lista blanca de dígitos y separadores; descripción y cabecera sin restricción.
- **Mismo formato de salida que la lectura digital**, de modo que `src/core/budget` consuma un `TextSource` común (pdfjs u OCR).
- **Alertas de montos** (digitales y escaneados): cantidad × tarifa × días = total por fila; suma de filas = subtotal; IVA = 16 % del subtotal; total = subtotal + IVA + logística impresa; IGTF = 3 % del total cuando existe. Tolerancia de 0,01. Cada diferencia es una alerta en la revisión con el impreso, el calculado y la diferencia. La asistente corrige el valor o la marca como revisada. Ninguna alerta bloquea la carga ni la generación. No se verifica la logística contra una base ni se sugiere un cambio de dígito. El cuadre de totales deja de pedir justificación y usa esta misma alerta.
- **Estados:** todo campo leído por OCR entra como "validar" salvo los montos de fila que cuadran, que quedan como confirmados por regla. Los campos de cabecera y cliente siempre quedan para validar.
- **Recortes para la revisión:** el servicio guarda la imagen de cada celda y fila; la revisión muestra el recorte junto al campo.
- **Calidad mínima:** se rechaza con mensaje claro una página con resolución efectiva menor a 150 dpi o sin rejilla de tabla detectable.
- **Manuscritos:** se detectan como trazos fuera de la rejilla con baja confianza de OCR y generan una advertencia; no se leen.
- **Conciliación:** al subir un PDF digital para un evento originado en escaneo, se procesa como nueva versión del presupuesto, se comparan ítems, cantidades, montos, fechas y salones, y se muestran solo las diferencias; las B.E.O. afectadas se regeneran como nueva versión con el flujo existente.

## Risks / Trade-offs

- Fotos de celular con sombras o curvatura pueden no detectar la rejilla. La corrección de perspectiva se implementa y se prueba con deformaciones sintéticas del escaneo; no valida fotos reales. La medición y el ajuste con muestras reales quedan en el change `validate-phone-photo-ingestion`. Si la rejilla no se detecta, se rechaza con un mensaje claro.
- La imagen Docker crece por OpenCV y Tesseract (~300 MB). Aceptable para despliegue local.
- Un error del OCR que casualmente cuadre la aritmética es muy improbable, pero posible; la revisión con recorte lo mitiga.
