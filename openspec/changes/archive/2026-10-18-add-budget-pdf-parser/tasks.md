# Tasks

## 1. Preparación de fixtures

- [x] 1.1 Copiar los presupuestos de ejemplo a `fixtures/presupuestos/` y sus B.E.O. a `fixtures/beo/`
- [x] 1.2 Escribir para cada presupuesto un JSON esperado (`fixtures/expected/*.json`) con días, bloques, salones, ítems y subtotal (empezar por Federación China, Almuerzo FARMA y Reumatología Evento 3)

## 2. Extracción de bajo nivel

- [x] 2.1 Wrapper de pdfjs-dist que devuelve fragmentos con texto, x, y, ancho y página; detección de PDF sin texto
- [x] 2.2 Agrupación de fragmentos en líneas con tolerancia vertical configurable
- [x] 2.3 Detección del encabezado de tabla y cálculo de límites de columnas por página
- [x] 2.4 Pruebas con los 9 presupuestos de fixtures

## 3. Interpretación

- [x] 3.1 Parser de montos (formatos europeo/estadounidense, paréntesis, guiones, CORTESÍA, "Incluido en el evento", "-") a céntimos, con pruebas
- [x] 3.2 Parser de fechas en español, incluidas fechas sin coma y rangos ("23 y 24 de octubre", "del 15 al 19 de octubre"), con pruebas
- [x] 3.3 Extracción de cabecera, datos del cliente y título del evento
- [x] 3.4 Máquina de estados de días y bloques; extracción de salón, horario, montaje, pax y renta (regular, neta, descuento, cortesía)
- [x] 3.5 Agrupación de ítems anclados a la cantidad, con descripción multilínea
- [x] 3.6 Extracción de totales, BENEFICIOS y detección de palabras clave en beneficios y cláusulas
- [x] 3.7 Esquema Zod de `ParsedBudget` con estado y origen por campo

## 4. Validación y reglas

- [x] 4.1 Validación de estructura con mensajes de página y sección
- [x] 4.2 Cuadre de totales con detalle de diferencias
- [x] 4.3 Normalización por reglas usando `resolveSalon`, `resolveSection` y `classifyItem`; campos no resueltos como "Pendiente"
- [x] 4.4 Pruebas contra los JSON esperados de fixtures (objetivo: cuadre exacto en todos)

## 5. Persistencia y API

- [x] 5.1 Modelos Prisma `Event`, `Budget`, `BudgetDay`, `BudgetBlock`, `BudgetItem`, `BudgetBenefit` y almacenamiento del PDF original
- [x] 5.2 Ruta `POST /api/budgets` (carga, lectura, persistencia, auditoría) y manejo de presupuesto repetido
- [x] 5.3 Pantalla de carga con resultado: errores de estructura, diferencias de cuadre y resumen de lo leído
- [x] 5.4 Prueba e2e: subir el presupuesto de Federación China y ver el resumen sin diferencias
