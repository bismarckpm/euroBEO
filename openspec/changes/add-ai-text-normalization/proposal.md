# Proposal

## Why

Cada ejecutivo llena el presupuesto a su estilo, así que las reglas fijas no resuelven todos los textos libres (salones escritos de otra forma, horarios y montajes mezclados en una celda, ítems no catalogados). Para que la app no deje campos vacíos y la asistente no los transcriba a mano, los campos pendientes se interpretan con IA, sin exponer datos sensibles.

## What Changes

- Normalización de campos con estado "Pendiente" tras el parser, en este orden: tabla de normalizaciones aprendidas → IA → pendiente para la asistente.
- Enmascaramiento de datos del cliente antes de cualquier llamada a la IA; nunca se envían montos ni el documento completo.
- Llamadas a la API de OpenAI con salida estructurada y validación con Zod contra el catálogo.
- Tabla de normalizaciones aprendidas, alimentada por las confirmaciones de la asistente.
- Registro de cada llamada (fragmento enmascarado, respuesta, resultado de validación).
- Pantalla para administrar las normalizaciones aprendidas.

Fuera de alcance: usar IA para montos, partición de B.E.O., generación de documentos o lectura del PDF completo.

## Capabilities

### New Capabilities
- `text-normalization`: interpretación asistida de textos libres del presupuesto con enmascaramiento, validación y aprendizaje.

### Modified Capabilities

## Impact

Módulo `src/core/normalization`, modelos `LearnedNormalization` y `AiCallLog`, dependencia `openai`. Variable `OPENAI_API_KEY` opcional: sin ella, los campos quedan pendientes.
