# Tasks

## 1. Datos y API

- [ ] 1.1 Rutas para leer el evento con sus B.E.O., memos, campos y líneas
- [ ] 1.2 Rutas para actualizar campo, validar campo, agregar/quitar/modificar línea, con auditoría
- [ ] 1.3 Servicio de datos compartidos del evento con réplica y sobrescritura por B.E.O.
- [ ] 1.4 Servicios de unir y separar B.E.O.
- [ ] 1.5 Pruebas de integración de los servicios

## 2. Interfaz

- [ ] 2.1 Página `/eventos/[id]/revision` con navegación lateral por día y salón y contadores de pendientes
- [ ] 2.2 Vista de B.E.O. en dos columnas con colores de estado
- [ ] 2.3 Editores de campo y de líneas con guardado automático
- [ ] 2.4 Panel de datos compartidos del evento (cartelera, compañía, contacto)
- [ ] 2.5 Opción "Recordar esta corrección" conectada al servicio de normalizaciones aprendidas
- [ ] 2.6 Botón "Confirmar y generar" con validación de pendientes

## 3. Pruebas

- [ ] 3.1 e2e: cargar el presupuesto de Reumatología, validar campos IA, confirmar cartelera, ajustar un precio y llegar a cero pendientes
- [ ] 3.2 e2e: botón deshabilitado con pendientes
