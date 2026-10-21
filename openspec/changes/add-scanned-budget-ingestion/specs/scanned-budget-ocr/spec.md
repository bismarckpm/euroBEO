# Spec Delta

## Purpose

Lectura local de presupuestos escaneados o fotografiados mediante OCR guiado por la rejilla de la tabla de la plantilla del hotel, produciendo fragmentos con coordenadas compatibles con el parser del presupuesto digital.

## ADDED Requirements

### Requirement: OCR local guiado por la rejilla
El sistema MUST leer los PDF sin capa de texto con un servicio de OCR local que detecte la rejilla de la tabla, lea cada celda por separado y lea a lo ancho las filas sin divisiones verticales (fechas y encabezados), y MUST NOT enviar el documento a servicios externos.

#### Scenario: Escaneo de Calox
- **WHEN** se procesa el escaneo del presupuesto de Calox International
- **THEN** se obtienen las filas "Acceso de agua" 1 × 50,00 = 50,00; "Supervisor" 1 × 58,50 = 58,50; "Asistentes de servicio" 2 × 39,00 = 78,00, y subtotal 186,50

#### Scenario: Filas de ancho completo
- **WHEN** una fila de la tabla no tiene divisiones verticales, como "jueves, 22 de octubre de 2026" o "ALIMENTOS Y BEBIDAS"
- **THEN** su texto se lee completo como una sola línea

### Requirement: Salida compatible con el parser
El servicio de OCR MUST devolver fragmentos con texto, posición, tamaño, confianza y tipo (celda, línea o encabezado) en el mismo sistema de coordenadas que la lectura digital, de modo que el parser existente los procese sin lógica distinta.

#### Scenario: Mismo resultado estructural
- **WHEN** el parser recibe los fragmentos del escaneo de Calox
- **THEN** produce un presupuesto con su bloque "Día previo de montaje", sus secciones y sus ítems, igual que si fuera digital

### Requirement: Preprocesamiento de la imagen
El servicio MUST rasterizar a 300 dpi, enderezar la página, neutralizar fondos grises con umbral adaptativo y, cuando detecte una foto, corregir la perspectiva a partir del contorno de la hoja.

#### Scenario: Bandas grises
- **WHEN** un encabezado de sección tiene fondo gris
- **THEN** su texto se lee correctamente tras el umbral adaptativo

### Requirement: Calidad mínima
El sistema MUST rechazar con un mensaje claro una página cuya resolución efectiva sea menor a 150 dpi o en la que no se detecte la rejilla de la tabla.

#### Scenario: Foto ilegible
- **WHEN** se sube una foto borrosa en la que no se detecta la tabla
- **THEN** el sistema la rechaza y pide un escaneo o foto más nítida, o el PDF digital

### Requirement: Advertencia de anotaciones manuscritas
El sistema MUST detectar trazos manuscritos dentro del área del presupuesto y MUST advertir a la asistente que puede haber correcciones a mano no leídas.

#### Scenario: Anotación sobre la tabla
- **WHEN** el escaneo tiene una cifra escrita a mano junto a una fila
- **THEN** la revisión muestra una advertencia con el recorte de esa zona
