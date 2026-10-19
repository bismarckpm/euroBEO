# Tasks

## 1. Plantilla

- [x] 1.1 Recibir la plantilla .docx original de la B.E.O. y sus fuentes; instalar las fuentes en la imagen Docker
- [x] 1.2 Insertar marcadores docxtemplater sin alterar el diseño (cabecera, fila, garantía, renta, cartelera, A&B, secciones, personal con subgrupos, instrucciones, montaje, iniciales)
- [x] 1.3 Definir el contrato `BeoTemplateData` (Zod) y la lista de marcadores requeridos
- [x] 1.4 Modelo `Template` (tipo, versión, ruta, activa) y validación de marcadores al cargar

## 2. Render y conversión

- [x] 2.1 `renderDocx(template, data)` con docxtemplater y pizzip
- [x] 2.2 `convertToPdf(docx)` con LibreOffice headless, perfil temporal y cola de una conversión
- [x] 2.3 `countPages(pdf)` con pdf-lib
- [x] 2.4 Prueba de humo: generar la B.E.O. de Federación China y comparar visualmente con 0.830

## 3. Regla de una página y correlativo

- [x] 3.1 Verificación de una página y separación automática de Sistemas en B.E.O. adicional
- [x] 3.2 Marca "Excede una página" cuando no hay Sistemas que mover
- [x] 3.3 Asignación de correlativo en transacción, edición previa y advertencia de repetidos
- [x] 3.4 Pruebas con el día más cargado de Congreso Pets

## 4. Archivos y descarga

- [x] 4.1 Modelo `GeneratedDocument` (B.E.O., versión, rutas .docx/.pdf, hash, plantilla usada)
- [x] 4.2 Nombre de archivo con el patrón del hotel (sin caracteres inválidos)
- [x] 4.3 Descarga individual y .zip del evento
- [x] 4.4 Conectar "Confirmar y generar" de la revisión con este flujo; prueba e2e de punta a punta con Reumatología
