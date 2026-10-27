# Design

## Context

El sistema mezcla dos situaciones distintas bajo el estado "Pendiente": datos que el presupuesto no trae (no se vendieron o no se informaron) y datos que vinieron pero no se pudieron interpretar. Solo la segunda requiere intervención.

## Goals / Non-Goals

**Goals:**
- Que ningún evento quede bloqueado por algo que no se vendió.
- Que nada de lo vendido se pierda sin aviso.

**Non-Goals:**
- Completar datos faltantes del presupuesto.

## Decisions

- **Estados de campo:** Regla (resuelto por reglas), IA (interpretado por la IA, para validar), Pendiente (el presupuesto trae texto que no se pudo interpretar, leer por OCR o clasificar; bloquea) y Sin dato (el presupuesto no lo trae; vacío; no bloquea).
- **Secciones:** una sección de la B.E.O. sin líneas no se imprime; ninguna sección es obligatoria.
- **Lugar del evento:** primera línea de la descripción del bloque antes de horario, montaje o pax, o el valor de "Salón:" si existe. Se quita "Salón"/"Salon" solo al inicio. Si coincide con el catálogo, se unifica al nombre oficial; si no, se usa tal cual. Estado "Regla"; "Sin dato" si el bloque no trae lugar.
- **Clave de partición:** lugar normalizado (minúsculas, sin acentos).
- **Cartelera:** título del evento con estado "Regla", editable.
- **Validación previa al render:** se mantiene el bloqueo por líneas sin sección, personal sin subgrupo, alimentos del presupuesto que no llegaron a la B.E.O. y textos con "Pendiente"; se elimina la exigencia de precio.
- **Estructura mínima del PDF:** basta con un encabezado de tabla reconocible.
- **Avisos de lectura:** «Ítem sin total» y la diferencia entre noches del bloque y días de la fecha son avisos. No son errores de estructura y no bloquean.
- **OCR:** «Validar» se resalta con el recorte, pero no entra en el contador ni deshabilita la generación.
- **Número de memorándum:** entero consecutivo al último emitido, guardado en configuración, propuesto al crear el memo y editable. Se consume al generar, como el correlativo. El formato no es `0.NNN/AA`; los memos del hotel usan un entero (75, 89).
- **Escaneo y digital:** una diferencia de subtotal, IVA, logística o total se lista con las demás diferencias. No pone la conciliación en fallo.

## Risks / Trade-offs

- Un dato que sí se vendió pero vino mal escrito puede confundirse con "Sin dato". Mitigación: si hay texto que no se interpreta (como "N° Pax: ..."), el campo queda vacío con estado "Sin dato" solo cuando el texto es un marcador vacío ("...", "-", en blanco); cualquier otro texto no interpretable queda "Pendiente".
