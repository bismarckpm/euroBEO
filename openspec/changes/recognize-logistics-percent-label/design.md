# Design

## Context

Ver proposal.md. `totalsKey` en `src/core/budget/parse-budget.ts` clasifica la fila de totales. El IVA acepta un porcentaje delante (`16% IVA`). La logística solo coincide si el texto, ya sin acentos y en minúsculas, empieza por `logistica`. El monto de la fila ya lo resuelve `lastAmount`, que ignora un porcentaje sin decimales. `verifyArithmetic` suma `subtotal + IVA + logística impresa` y no compara la logística contra una base. El resultado queda guardado en el presupuesto al cargarlo.

## Goals / Non-Goals

**Goals:**

- Que «1% de Logística» y «1% Logística» llenen `totals.logistics` con el monto impreso.
- Que la ecuación del total deje de alertar cuando subtotal, IVA y esa logística suman el total general.

**Non-Goals:**

- Recalcular el 1 %.
- Cambiar `verifyArithmetic`, la revisión o el esquema de base de datos.
- Reprocesar presupuestos ya guardados.

## Decisions

1. Ampliar el mismo predicado de `totalsKey`, no añadir otro paso de lectura. La clasificación ya decide si la fila es un total y el bucle existente guarda el monto en `budget.totals.logistics`. Alternativa: un postproceso que busque «logística» en cualquier línea. Se descarta porque podría tomar una frase de las cláusulas.
2. El patrón queda anclado al inicio, igual que el IVA: `^logistica\b` o `^\d+\s*%\s*(?:de\s+)?logistica\b`. `fold` ya quita el acento de «Logística». Alternativa: exigir la palabra «de». Se descarta; el IVA no la exige y «1% Logística» debe leerse igual.
3. La prueba es sintética, con encabezado de tabla, una fila que sume el subtotal y las cuatro líneas de totales. No se copia el PDF del cliente. Se afirma `totals.logistics` y que `verifyArithmetic` no emite alerta de total.

## Risks / Trade-offs

- [Una cláusula que empiece por «1% de Logística» se tomaría como total] → El patrón va anclado al inicio, igual que el IVA. En la plantilla los totales van antes de las cláusulas.
- [El evento ya cargado conserva la alerta] → El arreglo aplica al volver a leer el PDF. No hay migración: la alerta guardada no se reescribe sola.

## Migration Plan

Sin migración. Al desplegar, un presupuesto nuevo o vuelto a cargar usa la etiqueta. El evento que ya está en revisión sigue con la alerta hasta que se vuelva a subir el PDF.

## Open Questions

Ninguna.
