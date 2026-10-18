# Proposal

## Why

Los presupuestos usan nombres de salones, ítems y secciones escritos de forma distinta por cada ejecutivo ("Salon Plaza Real", "Plaza Real A y B", "SALON PLAZA CARACAS" para el salón Diamante). Además, la B.E.O. tiene textos fijos (instrucciones especiales, frase de preparación del servicio, iniciales) y el memorándum de estacionamiento tiene destinatario y cuerpo fijos. Todo eso debe ser configurable por la asistente, sin depender de desarrollo, antes de construir el parser y el motor de B.E.O.

## What Changes

- Catálogo de salones: nombre oficial (como va en la B.E.O.) y alias.
- Catálogo de secciones del presupuesto: encabezado (y sus variantes) → sección destino de la B.E.O. o "excluir".
- Catálogo de ítems frecuentes con categoría y sección destino.
- Textos fijos de la B.E.O.: instrucciones especiales, frase de preparación, iniciales del pie.
- Configuración del memorándum de estacionamiento: destinatario, empresa, referencia, cuerpo con variables y palabras clave disparadoras.
- Configuración del correlativo: último número emitido y año.
- Pantalla de configuración simple y datos semilla tomados de los ejemplos reales.

Fuera de alcance: hoja de precios, reglas de precios o de desglose de A&B, importación masiva desde Excel.

## Capabilities

### New Capabilities
- `configuration`: catálogos y textos configurables que usan el parser, el motor de B.E.O. y la generación de memorándums.

### Modified Capabilities

## Impact

Nuevos modelos Prisma (`Salon`, `SalonAlias`, `SectionMapping`, `CatalogItem`, `FixedText`, `MemoType`, `Sequence`), pantallas en `/configuracion` y servicio `src/core/config`. Lo consumen los changes de parser, normalización, B.E.O., documentos y memorándums.
