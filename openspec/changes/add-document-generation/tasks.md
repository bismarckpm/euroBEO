# Tasks

## 1. Plantilla

- [ ] 1.1 Recibir la plantilla .docx original de la B.E.O. y sus fuentes; instalar las fuentes en la imagen Docker
- [ ] 1.2 Insertar marcadores docxtemplater sin alterar el diseño (cabecera, fila, garantía, renta, cartelera, A&B, secciones, personal con subgrupos, instrucciones, montaje, iniciales)
- [ ] 1.3 Definir el contrato `BeoTemplateData` (Zod) y la lista de marcadores requeridos
- [ ] 1.4 Modelo `Template` (tipo, versión, ruta, activa) y validación de marcadores al cargar

## 2. Render y conversión

- [ ] 2.1 `renderDocx(template, data)` con docxtemplater y pizzip
- [ ] 2.2 `convertToPdf(docx)` con LibreOffice headless, perfil temporal y cola de una conversión
- [ ] 2.3 `countPages(pdf)` con pdf-lib
- [ ] 2.4 Prueba de humo: generar la B.E.O. de Federación China y comparar visualmente con 0.830

## 3. Regla de una página y correlativo

- [ ] 3.1 Verificación de una página y separación automática de Sistemas en B.E.O. adicional
- [ ] 3.2 Marca "Excede una página" cuando no hay Sistemas que mover
- [ ] 3.3 Asignación de correlativo en transacción, edición previa y advertencia de repetidos
- [ ] 3.4 Pruebas con el día más cargado de Congreso Pets

## 4. Archivos y descarga

- [ ] 4.1 Modelo `GeneratedDocument` (B.E.O., versión, rutas .docx/.pdf, hash, plantilla usada)
- [ ] 4.2 Nombre de archivo con el patrón del hotel (sin caracteres inválidos)
- [ ] 4.3 Descarga individual y .zip del evento
- [ ] 4.4 Conectar "Confirmar y generar" de la revisión con este flujo; prueba e2e de punta a punta con Reumatología
