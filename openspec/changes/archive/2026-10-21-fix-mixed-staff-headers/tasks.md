# Tasks

## 1. Reglas

- [x] 1.1 Detección de "montaje" y "desmontaje" como palabras completas sobre el texto normalizado, con pruebas
- [x] 1.2 Regla de encabezado mixto según tipo de bloque, con estado "validar" en bloques de evento
- [x] 1.3 Variantes de encabezado de bloque en la configuración de mapeo, con semilla ("Día previo de montaje", "Día de montaje", "Montaje", "Desmontaje", "Día de desmontaje")

## 2. Pruebas

- [x] 2.1 Prueba con los datos del presupuesto de Calox (bloque, sección y personal tal como aparecen en `fixtures/golden/scan-calox/expected-cells.json`)
- [x] 2.2 Prueba de encabezado mixto en bloque de evento
- [x] 2.3 Confirmar que los casos dorados existentes (cata, Reumatología, Nena) siguen en verde
