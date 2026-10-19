# Tasks

## 1. Partición

- [x] 1.1 Tipos de dominio `BeoDraft`, `BeoField<T>` (`value`, `status`, `source`), `BeoLine`
- [x] 1.2 Expansión de bloques por fecha y división de renta en céntimos
- [x] 1.3 Agrupación por fecha y salón, salones combinados y clasificación montaje/evento/desmontaje
- [x] 1.4 Asignación del desmontaje compartido con marca de revisión
- [x] 1.5 Pruebas: Reumatología = 6 B.E.O.; Congreso Pets = mismo número de B.E.O. de salón que las emitidas en fixtures (sin contar las de internet); Federación China = 1 B.E.O.

## 2. Mapeo de campos

- [x] 2.1 Cabecera y fila del evento (día en español, fecha `dd.mm.aaaa`, horario, columna EVENTO, salón sin "Salón")
- [x] 2.2 Garantía, renta y cartelera sugerida
- [x] 2.3 A&B de la columna izquierda (menú, N° pax, PRECIO por unidad, hora)
- [x] 2.4 Secciones de la columna derecha y personal por subgrupos con formato de cantidad y precio
- [x] 2.5 Textos fijos y tipo de montaje
- [x] 2.6 Pruebas comparando la propuesta con las B.E.O. reales de fixtures (0.830, 0.932, 0.933 a 0.938, 0.928), ignorando diferencias que vienen de cambios posteriores al presupuesto

## 3. Persistencia

- [x] 3.1 Modelos Prisma `Beo` (estado: borrador/generada), `BeoField`, `BeoLine`
- [x] 3.2 Servicio que genera y guarda la propuesta del evento tras la normalización
- [x] 3.3 Ruta `POST /api/events/:id/beo-proposal` y prueba de integración con el presupuesto de Reumatología
