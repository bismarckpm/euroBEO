# Design

## Context

Las plantillas originales aún no se reciben; solo hay PDF de B.E.O. reales. La primera tarea es convertir la plantilla Word del hotel en plantilla con marcadores sin alterar su diseño.

## Goals / Non-Goals

**Goals:**
- Documentos idénticos a la plantilla del hotel.
- Detectar automáticamente cuándo una B.E.O. excede una página.

**Non-Goals:**
- Editor de plantillas dentro de la app.

## Decisions

- **docxtemplater** con marcadores `{campo}` y bucles `{#lineas}…{/lineas}` para las listas con viñetas de cada sección y `{#personal}` con subgrupos. Las secciones vacías se ocultan con condicionales `{#tieneBebidas}…{/tieneBebidas}`. Alternativa: generar el XML del Word a mano; se descarta por fragilidad.
- **Contrato de datos de la plantilla** definido en `src/core/documents/beo-template-data.ts` (Zod): número, fecha de preparación, cabecera, fila del evento, garantía, renta, cartelera, A&B, secciones, personal, instrucciones, montaje, iniciales.
- **Conversión a PDF** con `soffice --headless --convert-to pdf` usando un directorio de perfil temporal por llamada y una cola de una conversión a la vez (evita bloqueos de LibreOffice).
- **Verificación de una página** contando páginas del PDF con pdf-lib. Si hay más de una: quitar la sección Sistemas, generar una B.E.O. adicional solo con Sistemas (título de la columna derecha "SISTEMAS"), y volver a verificar.
- **Correlativo** asignado en una transacción al confirmar la generación, en el orden de la lista (fecha, salón). La asistente puede editar el número antes de confirmar; el sistema advierte si está repetido.
- **Almacenamiento** de .docx y .pdf generados en disco (volumen) con referencia en `GeneratedDocument` (versión, ruta, hash).

## Risks / Trade-offs

- Las fuentes de la plantilla deben estar instaladas en el contenedor o el PDF cambiará de tamaño. Mitigación: incluir las fuentes en la imagen y probar con la B.E.O. más cargada de Congreso Pets.
- Diferencias entre el render de Word y de LibreOffice podrían hacer que una B.E.O. de una página en LibreOffice ocupe dos en Word. Mitigación: márgenes de seguridad y prueba visual con el hotel.
