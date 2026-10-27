# Tasks

## 1. Etiqueta de logística

- [x] 1.1 Ampliar `totalsKey` en `src/core/budget/parse-budget.ts` para que una fila que empieza por «Logística» o por un porcentaje seguido de «Logística» o de «de Logística» sea logística impresa. Verificar que «Logística», «1% Logística» y «1% de Logística» clasifican y que el monto sigue saliendo de `lastAmount`, sin cambiar `verifyArithmetic`.
- [x] 1.2 Agregar una prueba sintética, sin el PDF del cliente, con encabezado de tabla, una fila que sume 58.357,50 y los totales subtotal 58.357,50, «1% de Logística» 368,40, IVA 9.337,20 y total general 68.063,10. Verificar con Vitest que `totals.logistics` es 368,40, que no hay alerta de total y que «1% Logística» y «Logística» 587,79 también llenan la logística. La prueba de Nena sigue sin alerta de logística.
