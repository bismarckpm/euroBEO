# PRD — Generador de B.E.O. y memorándums (Eurobuilding)

Oct 17, 2026 · @Bismarck Ponce

## 1. Resumen

Una aplicación web que toma el presupuesto aprobado de un evento y genera automáticamente todas sus órdenes de servicio (B.E.O.) y memorándums asociados, respetando al 100% el formato de las plantillas del hotel. La persona encargada pasa de redactar cada documento a revisar y aprobar únicamente los campos marcados.

**Problema.** Hoy las B.E.O. y memorándums se elaboran a mano a partir del presupuesto. Un evento grande genera muchos documentos (Congreso Pets: 23 B.E.O.), lo que consume demasiado tiempo y produce inconsistencias entre documentos (el memo 75 indica un salón distinto al de la B.E.O. 0.830).

**Enfoque.** El núcleo es determinístico: un parser del PDF del presupuesto extrae y normaliza los datos, y un mapper llena las plantillas. La IA se usa solo como asistente para normalizar textos libres que las reglas no resuelven, trabajando exclusivamente con fragmentos sin datos sensibles.

**Métricas de éxito (a confirmar con el hotel):**

| Métrica | Línea base | Meta |
| --- | --- | --- |
| Tiempo para generar las B.E.O. y memos de un evento | Por medir en la sesión de levantamiento | Reducción significativa, a definir con la línea base |
| Campos que requieren corrección manual por B.E.O. | Por medir | Tendencia decreciente con el uso |
| Documentos con diferencias de formato frente a la plantilla | — | 0 |
| Inconsistencias entre B.E.O. y memorándums del mismo evento | Por medir | 0 |

## 2. Usuario

La herramienta la usa una sola persona: la asistente de ventas, que hoy recibe el presupuesto y elabora a mano las B.E.O. y los memorándums. La app recibe un documento y devuelve otros; no maneja roles, permisos ni flujos de aprobación.

Las firmas de "Revisado por" y "Aprobado por" de la B.E.O. se gestionan como hoy, fuera de la herramienta (a confirmar). Los catálogos y textos configurables los mantiene la misma asistente desde una pantalla de configuración simple; la carga inicial la hace Cleteci (supuesto).

## 3. Alcance del MVP

El MVP cubre el ciclo completo de un evento, desde la carga del presupuesto en PDF hasta la descarga de B.E.O. y memorándums aprobados.

**Incluido:**

- Carga del presupuesto en PDF generado digitalmente (con texto seleccionable) desde la plantilla estándar del hotel
- Validación de estructura y cuadre de totales
- Normalización por reglas, con IA asistida solo para campos de texto libre y con datos enmascarados
- Propuesta automática de B.E.O. según las reglas de partición validadas
- Pantalla de revisión con estados por campo (regla, IA, pendiente)
- Numeración correlativa sugerida y editable
- Generación de B.E.O. y memorándum de estacionamiento en Word y PDF desde las plantillas originales, con subida automática al Drive en formato editable
- Catálogos básicos: salones, categorías de ítems, destinatarios de memos, textos fijos
- Historial simple de eventos procesados para volver a descargar o regenerar documentos

**Fuera de alcance del MVP:**

- Presupuestos escaneados o fotografiados, que requieren OCR (se evalúa después del MVP)
- Integración con sistemas del hotel (PMS o sistema de eventos). Tampoco se gestiona la hoja de precios ni reglas de desglose de A&B: la asistente ajusta precios y menús manualmente
- Envío automático de documentos por correo a los departamentos
- Firma digital, gestión de usuarios, roles y flujos de aprobación
- Otros tipos de memorándum: hoy solo existe el de estacionamiento; la app permite agregar nuevos tipos por configuración

## 4. Flujo principal

El flujo es lineal con un punto de control humano antes de emitir documentos.

1. **Carga.** La asistente sube el PDF del presupuesto aprobado.
2. **Validación de estructura.** El sistema verifica que el PDF tenga texto extraíble y la estructura esperada; si no, rechaza la carga e indica qué falta.
3. **Normalización.** El parser convierte el presupuesto en un modelo estructurado: cabecera, días, bloques, salones e ítems.
   1. Los campos que las reglas no resuelven se buscan en la tabla de normalizaciones aprendidas.
   2. Si no hay coincidencia, el fragmento se enmascara y se envía a la IA con esquema JSON cerrado.
   3. Toda salida de la IA pasa por validaciones determinísticas.
4. **Cuadre.** El sistema recalcula cantidad × tarifa y compara con los totales del presupuesto.
5. **Propuesta de B.E.O.** El motor de reglas parte el evento en B.E.O. (una por día × salón) y llena cada campo.
6. **Propuesta de memorándums.** El sistema detecta disparadores (por ejemplo, tarifa plana de estacionamiento) y prepara los memos consolidando días y salones desde las B.E.O.
7. **Revisión.** La asistente ve cada documento con sus campos marcados por estado, corrige y completa lo pendiente.
8. **Generación.** Al confirmar, se asignan los correlativos, se llenan las plantillas Word originales y se exportan a PDF.
9. **Guardado.** Los documentos se suben automáticamente al Drive en formato Word editable y también se pueden descargar; quedan en un historial simple para regenerarlos.

## 5. Historias de usuario

Cada historia lleva prioridad MoSCoW (Must, Should, Could) y criterios de aceptación verificables. Las reglas de negocio de las que dependen están confirmadas por el hotel (sección 6).

### Épica 1 — Carga y validación del presupuesto

**HU-01 · Cargar presupuesto (Must).** Como asistente, quiero subir el PDF del presupuesto aprobado, para iniciar la generación de documentos del evento.

- Acepta archivos .pdf con texto seleccionable de hasta un tamaño razonable definido en configuración.
- Rechaza otros formatos y PDF escaneados (sin texto) con un mensaje claro.
- Si el localizador ya existe, pregunta si se trata de una nueva versión del mismo evento.

**HU-02 · Validar estructura (Must).** Como asistente, quiero que el sistema verifique que el PDF sigue el formato estándar de presupuesto, para no generar documentos sobre datos mal leídos.

- Verifica la presencia de cabecera (localizador, ejecutivo, cliente, check-in/out), bloques por día y totales.
- Si falta una sección o cambió un encabezado, detiene el proceso e indica la página o sección con problema. La lectura se hace por posición de columnas (Cantidad, Descripción, Noches, Moneda, Tarifa, Total) y contempla montos entre paréntesis, descuentos y descripciones en varias líneas.

**HU-03 · Cuadrar totales (Must).** Como asistente, quiero que el sistema recalcule los montos y los compare con el presupuesto, para tener certeza de que se leyeron todos los ítems.

- Recalcula cantidad × tarifa por ítem y el subtotal general.
- Si hay diferencia, muestra las líneas involucradas y no permite avanzar hasta resolverlas o justificarlas.

### Épica 2 — Normalización asistida

**HU-04 · Normalizar por reglas (Must).** Como asistente, quiero que el sistema descomponga automáticamente los textos del presupuesto en campos (salón, horario, montaje, pax, categoría), para no transcribirlos a mano.

- Usa patrones y catálogos (salones, categorías de ítems, tipos de montaje).
- Cada campo resuelto queda marcado con estado "Regla".

**HU-05 · Reutilizar normalizaciones aprendidas (Must).** Como asistente, quiero que el sistema recuerde las correcciones que ya confirmé, para no repetirlas en eventos futuros.

- Antes de llamar a la IA, busca el texto en la tabla de normalizaciones confirmadas.
- Si encuentra coincidencia exacta, aplica el resultado con estado "Regla".

**HU-06 · Normalizar con IA los textos no resueltos (Must).** Como asistente, quiero que la IA interprete los textos que las reglas no entienden, para que la app no deje campos vacíos.

- Solo se envían fragmentos de texto, nunca el presupuesto completo ni montos.
- Antes de enviar, se enmascaran nombre del cliente, contacto, teléfonos, correos y RIF.
- La respuesta debe cumplir un esquema JSON cerrado; si no, el campo queda "Pendiente".
- Los valores pasan por validación: salón existente en catálogo, pax numérico, horario válido y dentro de las fechas del evento.
- Los campos resueltos quedan marcados con estado "IA".

**HU-07 · Detectar cláusulas que disparan acciones (Must).** Como asistente, quiero que el sistema identifique en las cláusulas los servicios que requieren memorándum, para no olvidar ninguno.

- Revisa el apartado de beneficios y las cláusulas del presupuesto, detectando por palabras clave configurables (por ejemplo, "tarifa plana de estacionamiento").
- Si la redacción no coincide, la IA clasifica la cláusula sobre el texto enmascarado.
- El resultado se muestra al coordinador para confirmar.

### Épica 3 — Propuesta de B.E.O.

**HU-08 · Partir el evento en B.E.O. (Must).** Como asistente, quiero que el sistema proponga automáticamente cuántas B.E.O. lleva el evento, para no armarlas una por una.

- Genera una B.E.O. por día × salón (RN-01). Un día solo de montaje o solo de desmontaje lleva B.E.O. propia; si montaje y evento coinciden en el día, van en la misma (RN-02, RN-03, RN-12).
- Incluye los servicios de Sistemas en su apartado dentro de la B.E.O. principal (RN-11).
- Muestra la lista propuesta antes de generar el detalle, con opción de unir o separar B.E.O.

**HU-09 · Llenar los campos de cada B.E.O. (Must).** Como asistente, quiero que cada B.E.O. venga llena con los datos del presupuesto, para solo revisarla.

- Cabecera: evento, compañía, contacto, teléfono, fecha de preparación.
- Fila del evento: día, fecha, horario, tipo de evento, salón.
- Garantía, renta de salón neta de descuento, montaje.
- Alimentos y bebidas, accesos, bebidas, descorche y personal agrupados según la plantilla, siempre con el precio por unidad (RN-14).
- Instrucciones especiales con el texto estándar configurable, editable por evento (RN-07).

**HU-10 · Agrupar el personal (Must).** Como asistente, quiero que el personal se organice en Montaje, Evento y Desmontaje, para que cada departamento sepa cuándo se requiere.

- Respeta las marcas AM y PM del presupuesto.
- Muestra cantidad, cargo y tarifa unitaria con el formato "USD 00,00 c/u".

**HU-11 · Ajustar precios manualmente (Must).** Como asistente, quiero que las tarifas de la B.E.O. vengan precargadas con los montos del presupuesto y poder corregirlas con la hoja de precios, para no transcribir cada ítem.

- Cada tarifa se muestra precargada con el monto del presupuesto y es editable en la pantalla de revisión.
- En el MVP la app no gestiona la hoja de precios ni reglas de conversión; la asistente ajusta los montos manualmente.

### Épica 4 — Revisión y generación

**HU-12 · Revisar con estados por campo (Must).** Como asistente, quiero ver de dónde viene cada dato, para concentrar mi revisión donde hace falta.

- Cada campo muestra su estado: Regla (sin marca), IA (resaltado para validar) o Pendiente (dato que no está en el presupuesto).
- Un contador indica cuántos campos faltan por validar en el evento.
- No se pueden generar los documentos finales con campos pendientes.

**HU-13 · Completar datos manuales con sugerencia (Must).** Como asistente, quiero que los campos que no están en el presupuesto vengan con una sugerencia, para confirmarlos en vez de escribirlos.

- Aplica a campos como cartelera y hora de servicio de alimentos.
- La sugerencia se muestra como pendiente hasta que el coordinador la confirme o edite.
- Un dato confirmado se replica a todas las B.E.O. del evento cuando aplique (por ejemplo, cartelera).

**HU-14 · Editar una B.E.O. propuesta (Must).** Como asistente, quiero modificar cualquier campo, agregar o quitar ítems, para reflejar cambios acordados con el cliente después del presupuesto.

- Toda edición queda registrada con fecha, valor anterior y nuevo. Incluye ajustar precios, menú, fecha, horario o pax cuando cambien después del presupuesto.
- Al confirmar una corrección de un campo normalizado, el sistema ofrece guardarla como normalización aprendida.

**HU-15 · Confirmar y generar el evento (Must).** Como asistente, quiero confirmar la revisión y generar todos los documentos del evento de una vez, para terminar el trabajo en un solo paso.

- El botón de generar solo se habilita cuando no quedan campos pendientes.
- Al confirmar se asignan los correlativos y se generan B.E.O. y memorándums juntos.

**HU-16 · Asignar correlativo (Must).** Como asistente, quiero que el sistema sugiera el siguiente número oficial de cada B.E.O., para no llevar el control a mano ni duplicar números.

- Formato 0.NNN/AA. Hoy el número se toma del último B.E.O. guardado en el Drive. La app arranca con el último número emitido (configurable; a futuro puede leerlo de la carpeta del Drive), propone el siguiente en cada generación y la asistente puede ajustarlo.
- Un número asignado no se reutiliza; si una B.E.O. se anula, el número queda registrado como anulado.

### Épica 5 — Generación de documentos

**HU-17 · Generar B.E.O. con la plantilla original (Must).** Como asistente, quiero descargar cada B.E.O. confirmada en Word y PDF, idéntica al formato del hotel, para distribuirla sin retoques.

- El documento se genera llenando la plantilla .docx original con marcadores; no se recrea el diseño.
- Tipografía, logos, tablas, negritas y posiciones coinciden con la plantilla.
- El PDF se genera a partir del Word final.
- Prueba de aceptación: comparar las B.E.O. generadas para Federación China y Congreso Pets contra las emitidas por el hotel.

**HU-18 · Variantes de sección por departamento (Must).** Como asistente, quiero que las B.E.O. de departamentos como Sistemas usen su título de sección, para que coincidan con las actuales.

- Por defecto, los servicios de Sistemas van como apartado dentro de la B.E.O. principal. Cuando se emiten en una B.E.O. aparte (HU-19), la columna derecha muestra "SISTEMAS" en lugar de "PERSONAL".

**HU-19 · Respetar una página por B.E.O. (Must).** Como asistente, quiero que cada B.E.O. ocupe una sola página, para cumplir el formato del hotel (RN-13).

- Si el contenido no cabe en una página, el sistema mueve el apartado de Sistemas a una B.E.O. aparte del mismo día y salón, con su propio correlativo, y avisa a la asistente. Si aun así no cabe, la B.E.O. queda marcada para que la asistente decida cómo dividirla.

**HU-20 · Descargar todo el evento (Should).** Como asistente, quiero descargar todas las B.E.O. y memos de un evento en un solo archivo comprimido, para distribuirlos rápido.

- Los archivos se nombran con el patrón actual (por ejemplo, B.E.O. 0.840 CONGRESO PETS - INNOVAGRO).

**HU-34 · Guardar en el Drive (Must).** Como asistente, quiero que todas las B.E.O. y memorándums generados se suban automáticamente al Drive en formato editable, para archivarlos como hoy sin pasos manuales (RN-15).

- Se suben en Word (.docx) editable a la carpeta de Google Drive del año en curso; el PDF es opcional.
- Se nombran con el patrón actual y la carpeta del año se crea automáticamente si no existe.
- La app confirma cada subida; si falla, permite reintentar y los archivos siguen disponibles para descarga.
- Si se regenera una B.E.O., se sube como versión nueva sin borrar la anterior, con el patrón actual más un sufijo de versión (por ejemplo, "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v2").

### Épica 6 — Memorándums

**HU-21 · Proponer memorándums desde las B.E.O. (Must).** Como asistente, quiero que el sistema prepare los memorándums que el evento necesita, para no redactarlos a mano.

- Se generan a partir de las B.E.O. del evento y de los disparadores detectados (HU-07). La asistente también puede agregar manualmente un memorándum que haya solicitado el ejecutivo.
- Los días y salones se toman de las B.E.O., garantizando consistencia entre documentos.
- Un memo consolida todos los días del evento cuando aplica (como el memo de Binghatti, del 15 al 19 de octubre).

**HU-22 · Memorándum de tarifa de estacionamiento (Must).** Como asistente, quiero generar el memo de tarifa plana de estacionamiento con la plantilla actual, para enviarlo a Servicios Parking.

- Destinatario, remitente, referencia y texto fijo vienen de configuración.
- Variables: fecha, días, nombre del evento, salón o salones, firmante.
- El firmante es el usuario que emite el memo, con su cargo.

**HU-23 · Agregar tipos de memorándum por configuración (Should).** Como asistente, quiero dar de alta nuevos tipos de memorándum con su plantilla, disparador y destinatario, para cubrir el catálogo completo sin desarrollo adicional.

- Cada tipo define: plantilla .docx, palabras clave o ítems que lo disparan, destinatario, variables y regla de consolidación.

**HU-24 · Actualizar memos si cambian las B.E.O. (Should).** Como asistente, quiero que, si modifico una B.E.O. ya generada, el sistema me avise qué memorándums se ven afectados, para mantenerlos consistentes.

- Muestra los memos impactados y permite regenerarlos como nueva versión.

### Épica 7 — Catálogos y configuración

**HU-25 · Catálogo de salones (Must).** Como asistente, quiero mantener la lista de salones con sus nombres equivalentes, para que el sistema reconozca las variantes del presupuesto.

- Cada salón tiene nombre oficial (como va en la B.E.O.) y alias (por ejemplo, "Salon Plaza Real", "Plaza Real A y B").

**HU-26 · Catálogo de ítems y categorías (Must).** Como asistente, quiero mantener los ítems frecuentes con su categoría y departamento, para que se ubiquen correctamente en la B.E.O.

- Categorías iniciales: Personal, Alimentos, Bebidas, Descorche, Accesos, Sistemas.
- Cada ítem indica a qué departamento y sección de la B.E.O. pertenece.

**HU-27 · Textos y reglas configurables (Must).** Como asistente, quiero editar los textos fijos y las reglas de negocio sin depender de desarrollo, para adaptarlos cuando cambien.

- Incluye: instrucciones especiales por condición de crédito, frase de preparación del servicio, regla de partición, palabras clave de disparadores.

**HU-28 · Gestionar plantillas (Should).** Como asistente, quiero subir una nueva versión de una plantilla .docx, para actualizar el formato sin cambiar código.

- El sistema valida que la plantilla contenga todos los marcadores requeridos antes de activarla.
- Los documentos ya emitidos conservan la versión de plantilla con la que se generaron.

**HU-29 · Administrar normalizaciones aprendidas (Should).** Como asistente, quiero ver y corregir las normalizaciones guardadas, para evitar que un error se repita.

- Lista con texto original, resultado y fecha.
- Permite editar, desactivar o convertir un patrón frecuente en regla.

### Épica 8 — Historial

**HU-30 · Historial de eventos (Should).** Como asistente, quiero consultar los eventos que ya procesé, para volver a descargar o regenerar sus documentos.

- Búsqueda por cliente, evento, fecha y localizador.
- Estados por evento: en revisión o generado.

**HU-31 · Versiones de documentos (Must).** Como asistente, quiero que cada cambio a un documento aprobado genere una nueva versión, para tener trazabilidad.

- Se conserva cada versión emitida con su fecha.
- Se puede comparar una versión con la anterior.

**HU-32 · Registro de uso de IA (Should).** Como asistente, quiero ver qué se envió a la IA y qué respondió, para auditar que no salgan datos sensibles.

- Se registra el fragmento enmascarado enviado, la respuesta y el resultado de validación.

### Épica 9 — Acceso

**HU-33 · Acceso protegido (Must).** Como asistente, quiero entrar a la herramienta con usuario y contraseña, para que los presupuestos y datos de clientes no queden expuestos.

- Un solo usuario en el MVP, sin roles ni permisos.
- Nombre y cargo configurables; se usan como firma en los memorándums.

## 6. Reglas de negocio conocidas

Son reglas observadas en los ejemplos (Federación China, Congreso Pets, Binghatti). Las confirmadas fueron validadas por el hotel; las observadas surgen del análisis de 6 eventos adicionales y deben confirmarse. Todas se cargan como configuración.

| ID | Regla | Evidencia | Estado |
| --- | --- | --- | --- |
| RN-01 | Una B.E.O. por día × salón (un miércoles con 3 salones = 3 B.E.O.) | Hotel; Congreso Pets | Confirmada |
| RN-02 | Un día solo de montaje lleva su propia B.E.O. | Hotel; Pets: B.E.O. 0.840 y 0.842 | Confirmada |
| RN-03 | Si montaje y evento son el mismo día, van en la misma B.E.O. | Hotel; Federación China: B.E.O. 0.830 | Confirmada |
| RN-04 | La garantía es siempre el pax | Hotel | Confirmada |
| RN-05 | La renta de salón se coloca como monto total con el descuento ya aplicado | Hotel; 0.830: USD 7.415,00 | Confirmada |
| RN-06 | La B.E.O. se precarga con los montos del presupuesto; la asistente los ajusta manualmente según la hoja de precios | Hotel | Confirmada |
| RN-07 | Las instrucciones especiales son un texto estándar, casi siempre igual para todos los eventos; se ajusta por evento cuando hace falta | Hotel | Confirmada |
| RN-08 | Los memorándums se emiten por solicitud del ejecutivo o según el presupuesto (beneficios o cláusulas). Hoy el único tipo es el de tarifa plana de estacionamiento | Hotel; memos 75 y 82 | Confirmada |
| RN-09 | El memo de estacionamiento consolida todos los días del evento en uno solo | Hotel; memo 82: 15 al 19 de octubre | Confirmada |
| RN-10 | El correlativo es consecutivo al último B.E.O. emitido (formato 0.NNN/AA); hoy se verifica a mano en el Drive | Hotel | Confirmada |
| RN-11 | Los servicios de Sistemas van en su apartado dentro de la B.E.O. principal | Hotel; Leti: B.E.O. 0.947 | Confirmada |
| RN-12 | Un día solo de desmontaje lleva su propia B.E.O. | Hotel; Pets: B.E.O. 0.855, 0.856 y 0.879 | Confirmada |
| RN-13 | Cada B.E.O. ocupa una sola página; si el contenido no cabe, Sistemas se emite en una B.E.O. aparte | Hotel; Pets: 6 B.E.O. de internet | Confirmada |
| RN-14 | Los precios de alimentos, personal y servicios se muestran siempre por unidad | Hotel | Confirmada |
| RN-15 | Todas las B.E.O. se suben a Google Drive en formato editable, en la carpeta del año en curso; al regenerar una B.E.O. se guarda una versión nueva con sufijo (v2, v3…) | Hotel | Confirmada |
| RN-16 | Un bloque que cubre varios días ("23 y 24 de octubre", 2 noches) se expande en una B.E.O. por día y la renta se divide entre los días | Reumatología: B.E.O. 0.933 a 0.938; renta 5.850 ÷ 2 = 2.925 | Observada |
| RN-17 | Salones combinados en una misma línea ("Turmalina - Opalo") van en una sola B.E.O. | Leti: B.E.O. 0.947 | Observada |
| RN-18 | Si el desmontaje es el mismo día del evento, va en la B.E.O. de ese día | Nena: B.E.O. 0.928 | Observada |
| RN-19 | Renta en cortesía o incluida en el evento se deja vacía o con guión; en días de montaje sin pax, la garantía queda vacía | B.E.O. 0.928, 0.932 y 0.933 | Observada |

## 7. Requisitos no funcionales

| Área | Requisito |
| --- | --- |
| Fidelidad de formato | Los documentos se generan sobre las plantillas .docx originales; ningún diseño se recrea por código ni por IA. Cada B.E.O. ocupa una sola página. |
| Uso de IA | Solo para normalizar fragmentos de texto. Nunca calcula montos, decide la partición, asigna números ni genera documentos. |
| Datos sensibles | Antes de cualquier llamada a la IA se enmascaran cliente, contacto, teléfonos, correos y RIF. Los montos no se envían. El hotel confirmó que los datos sensibles son los del cliente. |
| Validación | Toda salida de IA cumple un esquema JSON cerrado y pasa validaciones determinísticas; si falla, el campo queda pendiente. |
| Proveedor de IA | Se usa la API de OpenAI (ChatGPT). Se deben revisar y documentar las condiciones de retención de datos del plan contratado. El diseño permite cambiar de proveedor. |
| Continuidad | Si la IA no está disponible, la app sigue funcionando y marca como pendientes los campos que habría normalizado. |
| Trazabilidad | Se registran cargas, ediciones, versiones y llamadas a la IA. |
| Seguridad | Acceso protegido con un único usuario y comunicación cifrada. |
| Rendimiento | La propuesta de B.E.O. de un evento como Congreso Pets (23 B.E.O.) se genera en menos de un minuto (meta a validar). |
| Usabilidad | Interfaz en español, uso desde navegador de escritorio. |

**Stack tecnológico definido.** Un solo lenguaje (TypeScript) en todo el proyecto, para facilitar el desarrollo asistido por IA con OpenSpec, y despliegue local con Docker Compose (aplicación + base de datos). La aplicación necesita salida a internet solo para la API de OpenAI y Google Drive.

| Capa | Tecnología | Uso |
| --- | --- | --- |
| Frontend | React + Next.js (App Router) | Pantallas de carga, revisión, configuración e historial |
| Backend | Node.js (LTS) con TypeScript, en las rutas de servidor de Next.js; la lógica de negocio vive en módulos aislados para poder separarla en un servicio propio si hiciera falta | Parser, motor de reglas, generación de documentos, integraciones |
| Base de datos | PostgreSQL con Prisma como ORM | Eventos, B.E.O., memos, catálogos, normalizaciones, auditoría |
| Lectura del PDF | pdfjs-dist (texto con coordenadas) | Reconstruir las columnas del presupuesto |
| Plantillas Word | docxtemplater | Llenar las plantillas .docx originales sin alterar el formato |
| Conversión a PDF | LibreOffice en modo headless (dentro del contenedor) | Generar PDF y verificar que cada B.E.O. ocupe una página |
| IA | SDK oficial de OpenAI con salidas estructuradas y validación con Zod | Normalizar fragmentos de texto enmascarados |
| Drive | googleapis (API de Google Drive) | Subir B.E.O. y memos a la carpeta del año |
| Despliegue | Docker Compose: contenedor de la app (Node + LibreOffice) y contenedor de PostgreSQL | Instalación en un equipo o servidor local |

## 8. Modelo de datos

Entidades principales del modelo normalizado; el detalle de atributos se cierra en el diseño técnico.

| Entidad | Contenido principal | Relación |
| --- | --- | --- |
| Evento | Localizador, nombre, cliente, contacto, ejecutivo, check-in/out, condición de crédito, cartelera | Tiene presupuestos, B.E.O. y memos |
| Presupuesto | Archivo original, versión, fecha de emisión, totales, cláusulas | Pertenece a un evento |
| Día / bloque | Fecha, tipo (montaje, evento, desmontaje), salón, horario, montaje, pax, renta, descuento | Pertenece a un presupuesto |
| Ítem | Cantidad, descripción, tarifa, total, categoría, departamento, AM/PM | Pertenece a un bloque |
| B.E.O. | Correlativo, estado, versión, campos llenos, estado por campo | Agrupa ítems de un día × salón |
| Memorándum | Tipo, número, estado, versión, variables, firmante | Se origina en las B.E.O. de un evento |
| Tipo de memorándum | Plantilla, disparadores, destinatario, regla de consolidación | Configuración |
| Salón | Nombre oficial, alias | Catálogo |
| Ítem de catálogo | Descripción, categoría, departamento, sección de B.E.O. | Catálogo |
| Normalización aprendida | Texto original, resultado, fecha, activa | Se usa antes de llamar a la IA |
| Plantilla | Archivo .docx, tipo de documento, versión, marcadores | Usada por B.E.O. y memos |
| Registro de auditoría | Acción, entidad, valor anterior y nuevo, fecha | Transversal |

## 9. Supuestos, dependencias y riesgos

**Supuestos:**

- El presupuesto llega en PDF generado digitalmente (no escaneado) desde una misma plantilla, pero cada ejecutivo la llena a su estilo. Confirmado: no se puede entregar en Excel.
- El hotel cuenta con plantillas .docx oficiales de B.E.O. y memorándums.
- El correlativo es consecutivo al último B.E.O. emitido y se asigna al generar los documentos (confirmado).
- La app es de uso interno del hotel y en el MVP la usa una sola persona: la asistente de ventas. Las B.E.O. se archivan en Google Drive, en una carpeta por año (confirmado).

**Dependencias:**

- Plantillas .docx originales. Acceso a la carpeta del Drive del hotel con permisos de escritura.
- Respuestas del cuestionario de levantamiento y validación de reglas RN-01 a RN-10.
- Set de 3 a 5 eventos completos (presupuesto + B.E.O. + memos) para pruebas de aceptación.
- Cuenta de API de OpenAI contratada por el hotel o por Cleteci (a definir).
- Un responsable funcional del hotel que valide resultados.

**Riesgos:**

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Extracción incorrecta del PDF (columnas desalineadas, montos entre paréntesis, descripciones en varias líneas) | Ítems mal leídos o faltantes | Lectura por coordenadas de columna, cuadre de totales obligatorio (HU-03) y pruebas con presupuestos reales desde la primera semana |
| PDF escaneado o exportado desde otra herramienta | No se puede extraer texto | Validación al cargar con mensaje claro; OCR fuera del MVP |
| Cada ejecutivo llena la plantilla del presupuesto a su estilo (confirmado por el hotel) | Muchos campos marcados para revisión, menor ahorro | Normalización con IA, tabla de aprendizaje y acordar con el hotel un uso más estándar de la plantilla |
| Cambios en el formato del PDF del presupuesto | El parser falla | Validación de estructura al cargar, con mensaje claro y sin generar documentos |
| Reglas implícitas no levantadas | B.E.O. incorrectas | Sesión de levantamiento, reglas configurables y pruebas contra documentos reales |
| Presupuesto desactualizado frente a lo acordado con el cliente (observado en la mayoría de los eventos de muestra: fechas, horarios, pax y menús) | B.E.O. con datos viejos | Pantalla de revisión y edición con trazabilidad |
| La IA devuelve un valor plausible pero incorrecto | Error en un documento | Validaciones determinísticas y revisión obligatoria de campos con estado IA |
| Exposición de datos a un proveedor externo | Riesgo de privacidad | Enmascaramiento, envío solo de fragmentos y registro de llamadas |
| Plantillas Word con formato complejo | Diferencias visuales al llenar | Pruebas tempranas con las plantillas reales antes de construir el resto |

## 10. Preguntas abiertas y próximos pasos

Las preguntas abiertas están detalladas en el [cuestionario de levantamiento](https://claude.ai/code/artifact/f0e3cfb2-50dd-462d-ae84-9abbf4b4cd14). Las respuestas del hotel a las preguntas de levantamiento ya están incorporadas en las reglas RN. No quedan preguntas abiertas para el MVP.

Precios, desglose de menús y demás ajustes los resuelve la asistente en la pantalla de revisión; quedan fuera del alcance de esta versión.

**Próximos pasos:**

- [x] Levantar las reglas de negocio con el hotel
- [ ] Recibir las plantillas .docx originales y los memorándums de estacionamiento de los eventos de muestra (ya se recibieron 6 presupuestos adicionales con sus B.E.O.)
- [ ] Validar con la asistente la pantalla de revisión y la edición manual de precios
- [ ] Prueba técnica temprana: parser del PDF y llenado de la plantilla real con el día más cargado de Congreso Pets, verificando una página por B.E.O.
- [ ] Diseño técnico y estimación del MVP sobre las historias Must
