# Proposal

## Why

El presupuesto llega solo en PDF y cada ejecutivo llena la plantilla a su estilo. Para generar B.E.O. sin transcripción manual, el sistema debe leer el PDF y convertirlo en un modelo estructurado y confiable. Es el mayor riesgo técnico del MVP, por eso va antes que cualquier pantalla de negocio.

## What Changes

- Carga del PDF del presupuesto (solo PDF digital con texto).
- Extracción de texto con coordenadas (pdfjs-dist) y reconstrucción de columnas: Cantidad, Descripción, Noches/Día, Moneda, Tarifa/Sub-Total, Total.
- Modelo normalizado del presupuesto: cabecera, cliente, título del evento, días, bloques, salones, ítems, totales, beneficios y cláusulas relevantes.
- Lectura tolerante de montos (`1.234,56`, `1,234.56`, `( 25,00)`, `- 58,50-`, `CORTESÍA`, `Incluido en el evento`, `-`) y fechas (`viernes, 23 de octubre de 2026`, `jueves 1 de octubre de 2026`, `23 y 24 de octubre de 2026`).
- Validación de estructura y cuadre de totales: suma de ítems contra el subtotal del PDF.
- Normalización por reglas de los campos de bloque (salón, horario, montaje, pax) usando el catálogo de configuración; lo no resuelto queda marcado para el change de normalización con IA.
- Detección por palabras clave de beneficios y cláusulas que disparan memorándums.

Fuera de alcance: PDF escaneado (OCR), Excel, uso de IA (lo cubre `add-ai-text-normalization`).

## Capabilities

### New Capabilities
- `budget-ingestion`: carga, lectura, estructuración y validación del PDF del presupuesto.

### Modified Capabilities

## Impact

Módulo `src/core/budget` (parser puro y probado con fixtures), ruta `/api/budgets` para carga, modelos Prisma `Event`, `Budget`, `BudgetDay`, `BudgetBlock`, `BudgetItem`, `BudgetBenefit`. Dependencia: pdfjs-dist.
