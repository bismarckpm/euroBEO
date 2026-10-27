# Design

## Context

Ver proposal.md. Hoy «Abrir» entra en `eventos/[id]/revision` y `ReviewScreen` pinta a la vez el avance, los datos compartidos, la B.E.O. abierta, los memorándums, generar y la tabla. `src/core/review/guide.ts` ya sabe qué B.E.O. necesita revisión y cómo describir un archivo. La carga del PDF vive en `presupuestos`.

## Goals / Non-Goals

**Goals:**

- Una ruta por paso, de modo que el cuerpo de la pantalla sea solo ese paso.
- El orden de pasos y el salto de los que están en cero viven en `src/core`, sin Next.js.
- Reutilizar los campos, las líneas y la ventana de agregar línea.

**Non-Goals:**

- Una pantalla por sección dentro de la B.E.O.
- Otro generador, otra partición o un cambio de base de datos.

## Decisions

1. Cada paso es una ruta bajo `eventos/[id]/asistente`: `datos`, `beo/[beoId]`, `memo/[memoId]`, `generar` y `archivos`. El presupuesto sigue en `presupuestos?crear=1`. Alternativa: un query `paso` sobre la revisión actual. Se descarta porque el cuerpo seguiría siendo la misma página y fue lo que resultó difícil de usar.
2. `guide.ts` arma la secuencia: datos, cada B.E.O. en el orden ya existente, el memorándum solo si tiene pendientes o errores, generar y archivos. Siguiente y Anterior usan el siguiente paso que necesita revisión; el avance permite abrir también una B.E.O. en cero. Alternativa: ocultar las B.E.O. en cero. Se descarta porque la asistente debe poder volver a verlas.
3. `revision` redirige al primer paso pendiente, o a `generar` si no falta nada. «Abrir» y el enlace posterior al PDF usan esa entrada. Alternativa: dejar la revisión completa como segunda vista. Se descarta porque volvería a montar todo junto.
4. Los controles de unir, separar, caso dorado y agregar línea se quedan en la ruta de esa B.E.O. Regenerar y la tabla se quedan en `archivos`. Generar solo existe en `generar`.
5. El estado se sigue guardando con las acciones actuales de la revisión. No hay API nueva ni migración.

## Risks / Trade-offs

- [El change `guide-event-creation` decidió que el asistente vivía en la revisión] → Este diseño lo reemplaza. La requirement de generar de este change incluye las tres acciones, para que el archivo quede completo al archivarlo.
- [Un evento con muchas B.E.O. alarga el recorrido] → Siguiente salta las que están en cero y el avance abre cualquiera.
- [Enlaces guardados a `/revision`] → Esa ruta redirige al paso que corresponda.

## Migration Plan

Sin migración de base de datos. Un evento ya guardado se abre por la redirección. Para volver atrás basta con devolver «Abrir» a la revisión única.

## Open Questions

Ninguna.
