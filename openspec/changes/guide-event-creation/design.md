# Design

## Context

Ver proposal.md. El listado está en `src/app/(private)/eventos/page.tsx` y solo abre la revisión. La revisión muestra el contador como «Montaje · 1», fácil de no ver. `AddLine` deja cantidad 1 y el resto vacío siempre visible. Generar está en un solo botón. `Event` borra en cascada presupuestos, B.E.O., memorándums y documentos.

## Goals / Non-Goals

**Goals:**

- Un camino: listado, crear, presupuesto, B.E.O. pendientes, generar, tabla.
- Señal en la B.E.O. que no está abierta.
- Agregar una línea solo desde una ventana.
- Borrar el evento sin devolver números ni tocar Drive.

**Non-Goals:**

- Otra regla de partición, otra plantilla o borrar en Drive.
- Rehacer el editor de campos. El asistente usa la revisión que ya existe.

## Decisions

1. El asistente vive en la revisión, no en una pantalla paralela. «Crear evento» carga el PDF con el flujo actual y, al guardarlo, abre la revisión en el primer documento con pendientes. Alternativa: un wizard aparte que copie los campos. Se descarta porque duplicaría la edición.
2. La señal es una marca «Revisar» en el botón de la lista cuando `pendingCount > 0` o esa B.E.O. tiene un error de validación. El número se queda. Alternativa: solo color. Se descarta porque el número ya estaba y no se vio.
3. `AddLine` pasa a botón más `<dialog>`. Confirmar llama a `addBeoLine`, que ya rechaza la descripción vacía. Cerrar no llama.
4. Generar recibe un alcance `beos`, `memos` o `both` sobre la misma preparación. No hay un segundo generador.
5. La tabla sale de los documentos recién creados: número, lugar y fecha de la B.E.O., y el contenido según el tipo (`MONTAJE`, `EVENTO`, `DESMONTAJE`), la parte `systems`, o el memorándum.
6. Eliminar pide confirmación con cliente y nombre, borra el `Event` y la carpeta `data/generated/<id>`. No toca `Sequence`.

## Risks / Trade-offs

- [Borrar un evento generado deja en Drive copias que la app ya no lista] → La confirmación lo dice. No se llama a Drive.
- [El asistente es largo en un evento de muchas B.E.O.] → Se salta las que ya están en cero y la lista sigue permitiendo abrir cualquiera.

## Migration Plan

Sin migración de base de datos. Un evento ya abierto sigue en la misma revisión, con la señal, la ventana y los tres botones.

## Open Questions

Ninguna.
