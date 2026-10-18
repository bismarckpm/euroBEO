# Design

## Context

La asistente es la única usuaria y también mantiene la configuración. Cleteci hace la carga inicial con datos semilla extraídos de los presupuestos y B.E.O. de ejemplo.

## Goals / Non-Goals

**Goals:**
- Que el parser y el motor de reglas no tengan nombres ni textos fijos en el código.
- Que la asistente pueda corregir un alias o un texto en segundos.

**Non-Goals:**
- Versionado de la configuración o historial de cambios más allá de la auditoría general.

## Decisions

- **Secciones destino de la B.E.O.** como enumeración fija: `ALIMENTOS`, `BEBIDAS`, `ACCESOS`, `DESCORCHE`, `SISTEMAS`, `MOBILIARIO`, `ELECTRICIDAD`, `PERSONAL`, `EXCLUIR`. La plantilla define dónde se pinta cada una.
- **Coincidencia de alias** normalizando texto (minúsculas, sin acentos, sin la palabra "salón", espacios colapsados). Alternativa: coincidencia difusa; se descarta en esta capa porque los casos difíciles los resuelve el change de normalización con IA.
- **Subgrupo de personal** (Montaje / Evento / Desmontaje) no es configuración: lo deduce el motor según el bloque del presupuesto.
- **Correlativo** en tabla `Sequence` con bloqueo de fila al asignar, para evitar duplicados.
- **Datos semilla** (`prisma/seed-config.ts`) con los salones vistos en los ejemplos: Plaza Real (A, B), Plaza Venezuela, Plaza Caracas/Diamante, Zafiro, Topacio, Turmalina, Ópalo, Costa Dorada, entre otros; textos fijos copiados de las B.E.O. reales; memo de estacionamiento según los memos 75 y 82.

## Risks / Trade-offs

- Un alias mal configurado asigna ítems al salón equivocado. Mitigación: la pantalla muestra a qué salón resolvió cada texto en la revisión del evento.
