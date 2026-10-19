# Design

## Context

El parser deja campos con estado "Pendiente" cuando no logra resolverlos por reglas. El hotel confirmó que los datos sensibles son los del cliente.

## Goals / Non-Goals

**Goals:**
- Reducir los campos que la asistente debe completar a mano.
- Garantizar que ningún dato del cliente ni monto salga hacia el proveedor de IA.
- Que el sistema aprenda y llame cada vez menos a la IA.

**Non-Goals:**
- Corregir errores del presupuesto o inferir datos que no están en él.

## Decisions

- **Tipos de tarea cerrados**, cada uno con su esquema Zod:
  - `block_fields`: de un texto de bloque obtener `{ salonCandidates[], scheduleStart, scheduleEnd, setupType, pax }`.
  - `item_section`: de una descripción y su encabezado obtener `{ target }` dentro de la enumeración de secciones.
  - `trigger_clause`: de un beneficio o cláusula obtener `{ memoTypeKey | null }`.
- **Restricción al catálogo:** el prompt incluye solo nombres oficiales de salones y secciones; si la respuesta no pertenece al catálogo, se descarta.
- **Enmascaramiento** con los valores ya extraídos de la cabecera (empresa, contacto, teléfonos, correo, RIF, dirección) más patrones (correo, teléfono, RIF `J-\d+`, números de 7+ dígitos). Reemplazo por `[CLIENTE]`, `[CONTACTO]`, `[TELEFONO]`, etc. Montos eliminados del fragmento.
- **Clave de aprendizaje** = tarea + texto normalizado (`normalizeLabel`). Coincidencia exacta; sin coincidencia difusa en el MVP.
- **Proveedor detrás de una interfaz** `NormalizationProvider` para poder cambiar de modelo o proveedor. Modelo configurable por variable de entorno.
- **Tiempo límite y reintentos acotados** (1 reintento); ante fallo, el campo queda "Pendiente".

## Risks / Trade-offs

- La IA puede devolver un valor plausible pero incorrecto. Mitigación: catálogo cerrado, validación y estado "IA" visible para revisión obligatoria.
- Un patrón de enmascaramiento incompleto podría dejar pasar un dato. Mitigación: pruebas con todos los fixtures y registro auditable de lo enviado.
