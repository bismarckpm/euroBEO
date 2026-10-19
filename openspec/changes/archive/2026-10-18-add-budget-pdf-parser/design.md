# Design

## Context

Muestra analizada: 9 presupuestos reales (Federación China, Congreso Pets, Binghatti, Alta Cocina, Reumatología ×3, Nena, MED URO Leti, Tata López). Todos comparten plantilla y tienen capa de texto. Variaciones observadas:

- Cabecera a la derecha: Localizador, Emisión, Check In, Check Out, Ejecutivo, Cargo, Email, Teléfono.
- "DATOS DEL CLIENTE": Empresa, Persona Contacto, Teléfonos/Telf, Dirección Fiscal, Correo Electrónico, Rif/R.I.F.
- Título del evento centrado en mayúsculas (p. ej. "CONGRESO NACIONAL DE REUMATOLOGÍA"), luego líneas de fecha y encabezados de bloque ("MONTAJE", "EVENTO", "MONTAJE SALÓN ZAFIRO", "DESMONTAJE AMBOS SALONES", "SALON PLAZA VENEZUELA - CARACAS").
- Encabezados de tabla con variantes: "Noches" o "Día"; "Tarifa" o "Sub - Total".
- Descripciones de varias líneas centradas verticalmente respecto de la fila de cantidad.
- Montos en formato europeo y estadounidense mezclados; negativos entre paréntesis o guiones (son formato visual, no negativos reales).
- Renta: "Renta regular", "Renta especial", "Descuento corporativo/especial/día de montaje", porcentajes, "CORTESÍA".
- Totales: SUB-TOTAL/Sub Total, IVA, Logística, Total General, IGTF, Total en Divisas/TOTAL A PAGAR.
- Después de "CLÁUSULAS Y CONDICIONES" el texto puede venir superpuesto; no se usa salvo para detectar palabras clave.

## Goals / Non-Goals

**Goals:**
- Extraer montos y cantidades de forma determinística y verificable (cuadre).
- Producir un modelo intermedio estable que el motor de B.E.O. pueda consumir.
- Fallar de forma explícita y comprensible cuando el PDF no se puede leer.

**Non-Goals:**
- Entender texto libre ambiguo (lo hace la normalización con IA).
- Leer cláusulas en detalle.

## Decisions

- **Lectura por coordenadas, no por texto plano.** Se agrupan los fragmentos de pdfjs por línea (tolerancia vertical) y se asignan a columnas según las posiciones x detectadas en el encabezado de tabla de cada página. Alternativa: `pdftotext -layout`; se descarta porque pierde precisión con descripciones multilínea.
- **Filas ancladas a la cantidad.** Cada número en la columna Cantidad abre un ítem; las líneas de descripción entre la fila anterior y la siguiente se asignan a la más cercana verticalmente.
- **Máquina de estados de bloques**: título del evento → fecha(s) → encabezado de bloque → salón → secciones → ítems → totales → BENEFICIOS → fin (al llegar a "CLÁUSULAS").
- **Fechas en rango** ("23 y 24 de octubre de 2026", "del 15 al 19") generan una lista de fechas para el bloque; el campo Noches/Día debe coincidir con la cantidad de fechas o se marca advertencia.
- **Montos como enteros en céntimos** para evitar errores de coma flotante.
- **Modelo de salida** (Zod): `ParsedBudget { header, client, eventTitle, days[{ dates[], blocks[{ kind: MONTAJE|EVENTO|DESMONTAJE|OTRO, rawTitle, salonRaw, salonId?, schedule?, setup?, pax?, rent{regular?, net?, discountLabel?, courtesy}, sections[{ headerRaw, target, items[{ qty, description, nights, unitPrice?, total?, flags }] }] }] }], totals, benefits[], triggers[], warnings[] }`.
- **Cada campo con origen y estado** (`RULE`, `PENDING`) para que la revisión sepa qué validar.

## Risks / Trade-offs

- Variantes no vistas en la muestra pueden romper la reconstrucción de columnas. Mitigación: pruebas con todos los fixtures, mensajes de error con página y línea, y cuadre obligatorio.
- El cuadre puede fallar por errores del propio presupuesto. Mitigación: la asistente puede justificar la diferencia y continuar.
