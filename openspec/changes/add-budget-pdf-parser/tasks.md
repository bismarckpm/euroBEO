# Tasks

## 1. Preparación de fixtures

- [ ] 1.1 Copiar los presupuestos de ejemplo a `fixtures/presupuestos/` y sus B.E.O. a `fixtures/beo/`
- [ ] 1.2 Escribir para cada presupuesto un JSON esperado (`fixtures/expected/*.json`) con días, bloques, salones, ítems y subtotal (empezar por Federación China, Almuerzo FARMA y Reumatología Evento 3)

## 2. Extracción de bajo nivel

- [ ] 2.1 Wrapper de pdfjs-dist que devuelve fragmentos con texto, x, y, ancho y página; detección de PDF sin texto
- [ ] 2.2 Agrupación de fragmentos en líneas con tolerancia vertical configurable
- [ ] 2.3 Detección del encabezado de tabla y cálculo de límites de columnas por página
- [ ] 2.4 Pruebas con los 9 presupuestos de fixtures

## 3. Interpretación

- [ ] 3.1 Parser de montos (formatos europeo/estadounidense, paréntesis, guiones, CORTESÍA, "Incluido en el evento", "-") a céntimos, con pruebas
- [ ] 3.2 Parser de fechas en español, incluidas fechas sin coma y rangos ("23 y 24 de octubre", "del 15 al 19 de octubre"), con pruebas
- [ ] 3.3 Extracción de cabecera, datos del cliente y título del evento
- [ ] 3.4 Máquina de estados de días y bloques; extracción de salón, horario, montaje, pax y renta (regular, neta, descuento, cortesía)
- [ ] 3.5 Agrupación de ítems anclados a la cantidad, con descripción multilínea
- [ ] 3.6 Extracción de totales, BENEFICIOS y detección de palabras clave en beneficios y cláusulas
- [ ] 3.7 Esquema Zod de `ParsedBudget` con estado y origen por campo

## 4. Validación y reglas

- [ ] 4.1 Validación de estructura con mensajes de página y sección
- [ ] 4.2 Cuadre de totales con detalle de diferencias
- [ ] 4.3 Normalización por reglas usando `resolveSalon`, `resolveSection` y `classifyItem`; campos no resueltos como "Pendiente"
- [ ] 4.4 Pruebas contra los JSON esperados de fixtures (objetivo: cuadre exacto en todos)

## 5. Persistencia y API

- [ ] 5.1 Modelos Prisma `Event`, `Budget`, `BudgetDay`, `BudgetBlock`, `BudgetItem`, `BudgetBenefit` y almacenamiento del PDF original
- [ ] 5.2 Ruta `POST /api/budgets` (carga, lectura, persistencia, auditoría) y manejo de presupuesto repetido
- [ ] 5.3 Pantalla de carga con resultado: errores de estructura, diferencias de cuadre y resumen de lo leído
- [ ] 5.4 Prueba e2e: subir el presupuesto de Federación China y ver el resumen sin diferencias
