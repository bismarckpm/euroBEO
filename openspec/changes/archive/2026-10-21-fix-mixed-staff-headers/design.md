# Design

## Context

Regla vigente: encabezado con "DESMONTAJE" → Desmontaje; con "MONTAJE" → Montaje; resto → Servicio Evento; el tipo de bloque solo desempata. "MONTAJE - DESMONTAJE" contiene ambas palabras y la regla actual lo resuelve mal.

## Goals / Non-Goals

**Goals:**
- Resolver encabezados mixtos sin romper los casos dorados existentes (cata, Reumatología, Nena).

**Non-Goals:**
- Dividir automáticamente una línea de personal entre montaje y desmontaje.

## Decisions

- **Detección de palabras completas** sobre el texto normalizado: se buscan los tokens "montaje" y "desmontaje" por separado (sin que "desmontaje" cuente como "montaje").
- **Encabezado mixto** (ambos tokens): bloque de montaje → Montaje; bloque de desmontaje → Desmontaje; bloque de evento → Montaje con estado "validar", porque no se puede saber en qué momento trabaja ese personal.
- **Variantes de bloque** en la configuración existente de mapeo de encabezados (tipo destino MONTAJE, EVENTO o DESMONTAJE), con semilla: "Día previo de montaje", "Día de montaje", "Montaje", "Desmontaje", "Día de desmontaje".

## Risks / Trade-offs

- Un encabezado mixto en un bloque de evento queda para validación manual; es preferible a adivinar.
