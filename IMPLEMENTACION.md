# Plan de implementación del MVP con OpenSpec

## Orden de los changes

| # | Change | Qué entrega | Depende de |
|---|--------|-------------|------------|
| 1 | `setup-project-foundation` | Proyecto Next.js + Prisma + Docker (app con LibreOffice + PostgreSQL), login de usuario único, auditoría | — |
| 2 | `add-configuration-catalogs` | Salones con alias, mapeo de secciones, ítems, textos fijos, tipo de memo, correlativo | 1 |
| 3 | `add-budget-pdf-parser` | Lectura del PDF, modelo estructurado, cuadre de totales, normalización por reglas | 2 |
| 4 | `add-ai-text-normalization` | IA solo para campos pendientes, enmascaramiento, aprendizaje, registro | 3 |
| 5 | `add-beo-proposal-engine` | Partición en B.E.O. y llenado de campos | 3 (4 opcional) |
| 6 | `add-event-review` | Pantalla de revisión, edición, confirmar y generar | 5 |
| 7 | `add-document-generation` | B.E.O. en Word/PDF desde la plantilla original, una página, correlativo, descarga | 6 + plantilla .docx |
| 8 | `add-parking-memo` | Memorándum de estacionamiento desde las B.E.O. | 7 + plantilla del memo |
| 9 | `add-drive-archiving` | Subida a Google Drive (carpeta del año, versiones v2) | 7 |
| 10 | `add-event-history` | Historial, regeneración, versiones, anulación | 7, 9 |

Hito 1 (validar riesgo técnico): changes 1 a 3, más una prueba de la plantilla real (tarea 2.4 del change 7).
Hito 2 (flujo completo sin IA ni Drive): changes 5 a 7.
Hito 3 (MVP completo): changes 4, 8, 9 y 10.

## Ciclo por change

1. Revisar el change: `openspec show <change>` y leer proposal, design, specs y tasks.
2. Ajustar si hace falta: `/opsx:update <change> <qué cambia>` en el chat del asistente.
3. Implementar: `/opsx:apply <change>`.
4. Verificar: pruebas en verde y revisión manual.
5. Archivar: `/opsx:archive <change>` (sincroniza las specs en openspec/specs/).
6. Commit y siguiente change.
