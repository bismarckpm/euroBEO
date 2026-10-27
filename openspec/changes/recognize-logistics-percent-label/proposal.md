# Proposal

## Why

Un presupuesto digital trae la logística como «1% de Logística» y el total general ya la incluye. El lector solo reconoce la fila si empieza por «Logística», así que esa línea se pierde y la revisión alerta una diferencia de total que en el PDF no existe.

## What Changes

- Reconocer como logística impresa una fila de totales que empieza por «Logística» o por un porcentaje seguido de «Logística» o «de Logística» (por ejemplo «1% de Logística»).
- Usar el monto impreso de esa fila en la ecuación del total que ya existe (subtotal + IVA + logística). No recalcular el porcentaje.
- La fila que ya empieza por «Logística», como la de Nena, sigue leyéndose igual.

Fuera de alcance: comprobar que el porcentaje coincida con alimentos y bebidas o con el subtotal, cambiar la ecuación del total, cambiar las alertas de filas o de IVA, y copiar el presupuesto real a fixtures o a pruebas versionadas.

## Capabilities

### New Capabilities

### Modified Capabilities

- `budget-ingestion`: la logística impresa se reconoce también cuando la etiqueta lleva el porcentaje delante.

## Impact

- `src/core/budget/parse-budget.ts`, en la clasificación de filas de totales.
- Prueba sintética de lectura y de la ecuación del total. La aritmética y la pantalla de revisión no cambian.
