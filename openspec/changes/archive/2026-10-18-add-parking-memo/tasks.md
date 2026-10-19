# Tasks

## 1. Plantilla y datos

- [x] 1.1 Recibir la plantilla .docx original del memorándum e insertar marcadores (número, fecha, para, empresa, de, cargo, referencia, cuerpo)
- [x] 1.2 Contrato `MemoTemplateData` (Zod) y validación de marcadores
- [x] 1.3 Utilidad de formato de lista de días en español ("15, 16 y 17 de octubre de 2026"), con pruebas

## 2. Lógica

- [x] 2.1 Modelo `Memo` (tipo, evento, número, estado, versión, campos)
- [x] 2.2 Propuesta automática por disparador y alta manual
- [x] 2.3 Construcción del contenido desde B.E.O. confirmadas, configuración y perfil
- [x] 2.4 Pruebas con los eventos de fixtures que tienen tarifa plana (FARMA, A&M FARMA, Nena, Leti)

## 3. Integración

- [x] 3.1 Mostrar memos en la revisión del evento con estados por campo
- [x] 3.2 Generar .docx y PDF con el motor de documentos e incluirlos en el .zip
- [x] 3.3 Aviso y regeneración cuando cambia una B.E.O.
- [x] 3.4 Prueba e2e: evento Nena con memo generado y consistente con sus B.E.O.
