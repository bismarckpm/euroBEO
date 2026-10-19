# Design

## Context

Reglas confirmadas y observadas en docs/PRD.md (sección 6). Validación disponible: Congreso de Reumatología debe producir 6 B.E.O. (0.933 a 0.938); Congreso Pets se valida contra las B.E.O. de salón emitidas en fixtures.

## Goals / Non-Goals

**Goals:**
- Proponer el número correcto de B.E.O. y sus campos sin intervención en los casos de la muestra.
- Mantener las reglas como funciones puras fáciles de probar y modificar.

**Non-Goals:**
- Decidir precios distintos a los del presupuesto.
- Garantizar que el contenido quepa en una página.

## Decisions

- **Algoritmo de partición:**
  1. Expandir cada bloque a una entrada por fecha (RN-16); la renta neta se divide en partes iguales entre las fechas, con el resto de céntimos en el último día.
  2. Agrupar por (fecha, salón oficial). Salones combinados en una línea forman una sola clave (RN-17).
  3. Un grupo con solo bloques de montaje → B.E.O. de montaje (RN-02); solo desmontaje → B.E.O. de desmontaje (RN-12); montaje o desmontaje junto con evento en la misma fecha y salón → una B.E.O. de evento que incluye sus subgrupos de personal (RN-03, RN-18).
  4. Bloques de desmontaje con varios salones ("todos los salones") sin salón único se asignan a la B.E.O. del último salón del día y se marcan para revisión.
- **Mapeo de campos:**
  - Cabecera: compañía = empresa; contacto y teléfono del cliente; dirección si existe.
  - Fila: día de la semana, fecha `dd.mm.aaaa`, horario del bloque, columna EVENTO = "Montaje"/"Desmontaje" o el tipo derivado del título (p. ej. "Congreso"; si no se deduce, "Evento"), salón oficial sin la palabra "Salón".
  - Garantía = pax (RN-04); vacía en montaje sin pax (RN-19).
  - Renta = neta del día (RN-05); vacía/guion si es cortesía (RN-19).
  - Cartelera sugerida = título del evento, estado "Pendiente" hasta confirmar.
  - A&B (columna izquierda): descripción del menú, `N° pax`, `PRECIO: USD x c/u x N pax`, hora si existe.
  - Columna derecha por sección destino; personal en subgrupos Montaje/Evento/Desmontaje según el bloque de origen; formato `cantidad 2 dígitos + descripción + USD 0,00 c/u` (RN-14).
  - Sistemas dentro de la B.E.O. principal (RN-11).
  - Instrucciones especiales y frase de preparación desde la configuración (RN-07).
- **Representación** de cada campo como `{ value, status, source }` para trazabilidad.

## Risks / Trade-offs

- La deducción del tipo de evento en la columna EVENTO es heurística. Se propone y queda editable.
- La asignación del desmontaje compartido es una suposición; queda marcada para revisión.
