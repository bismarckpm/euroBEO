# Prueba de concepto: OCR del escaneo de Calox

| Enfoque | Resultado |
|---|---|
| OCR de página completa (Tesseract spa, psm 6) | Pierde filas de ítems y cantidades; las bandas grises confunden la lectura |
| Umbral adaptativo + detección de rejilla + OCR por celda | Todos los ítems, cantidades, tarifas y totales correctos |

Valores leídos correctamente: Acceso de agua 1 × 50,00 = 50,00; Supervisor 1 × 58,50 = 58,50; Asistentes de servicio 2 × 39,00 = 78,00; subtotal 186,50; IVA 29,84; logística 0,50; total 216,84.

Verificación aritmética: todas las ecuaciones cuadran. La logística es 1 % sobre alimentos y bebidas (50,00), no sobre el subtotal.

Errores observados:
- Filas de ancho completo (fecha, "Día previo de montaje", "ALIMENTOS Y BEBIDAS") cortadas al leer por columnas.
- Cabecera: "Jeamette" en lugar de "Jeannette", correo y RIF con errores.
