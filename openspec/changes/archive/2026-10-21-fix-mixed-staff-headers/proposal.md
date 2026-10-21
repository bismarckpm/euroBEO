# Proposal

## Why

El presupuesto "Coctel - Encuentro Nena" (Calox International, 22/10/2026) trae la sección "PERSONAL PARA EL MONTAJE - DESMONTAJE". La regla vigente de "Personal agrupado" (archivada en `improve-beo-fidelity`) envía a Desmontaje cualquier encabezado que contenga "DESMONTAJE", así que ese personal, que trabaja en un día de montaje, terminaría en el subgrupo equivocado. El mismo presupuesto usa "Día previo de montaje" como encabezado de bloque, una variante que el parser debe reconocer como montaje.

## What Changes

- Encabezados de personal que mencionan montaje y desmontaje a la vez se asignan según el tipo de bloque; si el bloque es de evento, el personal se marca para validar.
- Reconocimiento configurable de variantes de encabezado de bloque ("Día previo de montaje", "Montaje", "Desmontaje", etc.).
- Caso de prueba con el presupuesto de Calox.

Fuera de alcance: cómo registrar en la B.E.O. áreas que no son salones (por ejemplo, "Stand Calox"); sigue quedando como salón pendiente hasta definirlo con la asistente.

## Capabilities

### New Capabilities

### Modified Capabilities
- `beo-proposal`: regla de subgrupo para encabezados mixtos de montaje y desmontaje.
- `budget-ingestion`: variantes configurables de encabezado de bloque.

## Impact

`src/core/beo` (subgrupo de personal), `src/core/budget` (tipo de bloque), datos semilla de configuración. Change pequeño; conviene aplicarlo antes de `add-scanned-budget-ingestion`, que usa el mismo presupuesto como caso dorado.
