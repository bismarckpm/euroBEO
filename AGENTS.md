# AGENTS.md

Instrucciones para agentes de código que trabajen en este repositorio.

## Proyecto

Generador de B.E.O. y memorándums para el hotel Eurobuilding. Recibe el PDF de un presupuesto de evento y genera las órdenes de servicio (B.E.O.) y memorándums en Word/PDF con el formato exacto de las plantillas del hotel, y los sube a Google Drive.

- Fuente funcional: `docs/PRD.md`.
- Contexto, reglas de negocio y alcance del MVP: `openspec/config.yaml`.
- Trabajo planificado: `openspec/changes/` (orden en `IMPLEMENTACION.md`).

## Flujo de trabajo

- Todo cambio funcional pasa por OpenSpec: no implementes nada que no esté en un change activo.
- Implementa un solo change a la vez, en el orden de `IMPLEMENTACION.md`, y marca las tareas en su `tasks.md` al completarlas.
- Si encuentras una ambigüedad o una regla que contradice el PRD, detente y pregunta; no asumas.
- No agregues funcionalidades fuera de alcance (hoja de precios, reglas de desglose de A&B, roles, OCR).

## Comandos

- Instalar: `npm install`
- Desarrollo: `npm run dev`
- Pruebas: `npm test` (Vitest) y `npm run test:e2e` (Playwright)
- Calidad: `npm run lint` y `npm run typecheck`
- Base de datos: `npx prisma migrate dev` y `npm run seed:user`
- Entorno completo: `docker compose up --build`
- Validar specs: `openspec validate --all --strict`

Antes de dar una tarea por terminada: lint, typecheck y pruebas en verde.

## Convenciones

- TypeScript estricto; sin `any` salvo justificación en comentario.
- Lógica de negocio pura en `src/core/`, sin importar nada de Next.js. Las rutas y páginas en `src/app/` solo orquestan.
- Validación de datos externos (PDF, IA, formularios, variables de entorno) con Zod.
- Montos como enteros en céntimos; formato de salida `1.234,56`. Fechas `dd/mm/aaaa` en la interfaz y `dd.mm.aaaa` en la B.E.O.
- Interfaz, mensajes y textos de documentos en español; identificadores de código en inglés.
- Cada regla de negocio lleva pruebas con datos de `fixtures/`.

## Restricciones críticas

- Los documentos se generan SOLO llenando las plantillas .docx originales con docxtemplater. Nunca recrees el diseño por código ni generes documentos con IA.
- Cada B.E.O. debe ocupar una sola página.
- La IA solo recibe fragmentos de texto enmascarados: nunca el presupuesto completo, montos ni datos del cliente (empresa, contacto, teléfonos, correos, RIF, dirección).
- `fixtures/` contiene datos reales de clientes: nunca lo agregues a git ni copies su contenido a código, pruebas versionadas o logs.
- No guardes secretos en el código ni en la base de datos; usa variables de entorno.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
