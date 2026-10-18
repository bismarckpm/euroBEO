# Tasks

## 1. Enmascaramiento

- [ ] 1.1 `maskFragment(text, clientData)` con reemplazo por valores de cabecera y patrones (correo, teléfono, RIF, números largos) y eliminación de montos
- [ ] 1.2 Pruebas con fragmentos reales de todos los fixtures: ningún dato del cliente debe sobrevivir

## 2. Proveedor de IA

- [ ] 2.1 Interfaz `NormalizationProvider` y adaptador OpenAI con salida estructurada; modelo y tiempo límite por variable de entorno
- [ ] 2.2 Esquemas Zod por tarea (`block_fields`, `item_section`, `trigger_clause`) y prompts con catálogo cerrado
- [ ] 2.3 Validación contra catálogo y rangos (pax numérico, horario válido)
- [ ] 2.4 Pruebas con proveedor simulado (respuestas válidas, inválidas, fuera de catálogo, error de red)

## 3. Aprendizaje y orquestación

- [ ] 3.1 Modelo `LearnedNormalization` (tarea, texto normalizado, resultado, activa, fecha)
- [ ] 3.2 Orquestador: aprendida → IA → pendiente, aplicado sobre el `ParsedBudget`
- [ ] 3.3 Servicio para guardar una confirmación de la asistente como normalización aprendida
- [ ] 3.4 Pruebas del orquestador, incluido el caso sin clave de OpenAI

## 4. Registro y administración

- [ ] 4.1 Modelo `AiCallLog` y escritura en cada llamada
- [ ] 4.2 Pantalla en `/configuracion` para normalizaciones aprendidas (listar, editar, desactivar) y consulta del registro de IA
- [ ] 4.3 Prueba e2e: corregir un salón, guardarlo y verificar que el siguiente procesamiento no llama a la IA
