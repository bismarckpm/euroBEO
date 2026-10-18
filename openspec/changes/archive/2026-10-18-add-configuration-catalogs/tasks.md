# Tasks

## 1. Modelo de datos

- [x] 1.1 Modelos Prisma: `Salon`, `SalonAlias`, `SectionMapping` (encabezado normalizado → sección destino), `CatalogItem`, `FixedText`, `MemoType`, `Sequence`
- [x] 1.2 Enumeración de secciones destino en `src/core/config/sections.ts`
- [x] 1.3 Función `normalizeLabel()` (minúsculas, sin acentos, sin "salón"/"salon", espacios colapsados) con pruebas

## 2. Servicios de configuración

- [x] 2.1 `resolveSalon(text)` → salón oficial o "no resuelto"; pruebas con los nombres de los fixtures
- [x] 2.2 `resolveSection(header)` y `classifyItem(description, section)`; pruebas con encabezados reales (PERSONAL, PERSONAL MONTAJE, PERSONAL PARA EL SERVICIO DE COMIDAS, ALIMENTOS Y BEBIDAS, SISTEMAS, DESCORCHE, ACCESO, MOBILIARIO, ELECTRICIDAD, HABITACIÓN)
- [x] 2.3 `getFixedTexts()`, `getMemoTypes()`
- [x] 2.4 `peekNextNumber()` y `assignNextNumber()` con bloqueo de fila; pruebas de concurrencia básica

## 3. Datos semilla

- [x] 3.1 `prisma/seed-config.ts` con salones y alias observados en los fixtures
- [x] 3.2 Mapeos de secciones y catálogo de ítems frecuentes (personal, filtros de agua, refrescos, agua mineral, internet, mesas cocteleras)
- [x] 3.3 Textos fijos copiados de las B.E.O. reales y tipo de memo "Tarifa de estacionamiento" según memos 75 y 82

## 4. Pantalla de configuración

- [x] 4.1 `/configuracion` con pestañas: Salones, Secciones, Ítems, Textos, Memorándums, Correlativo
- [x] 4.2 Altas, ediciones y bajas con validación Zod y registro en auditoría
- [x] 4.3 Prueba e2e: agregar un alias y verificar que `resolveSalon` lo usa
