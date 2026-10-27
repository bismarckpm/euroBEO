# Spec Delta

## MODIFIED Requirements

### Requirement: Validación de estructura
El sistema MUST verificar solo lo mínimo para leer el presupuesto: que exista al menos un encabezado de tabla reconocible. Cabecera, datos del cliente y sección de totales MUST ser opcionales. Si no hay tabla reconocible, MUST indicar la página con problema.

#### Scenario: Plantilla distinta
- **WHEN** se sube un PDF que no tiene encabezado de tabla reconocible
- **THEN** el sistema detiene el proceso e indica en qué página no encontró la tabla

#### Scenario: Presupuesto sin totales
- **WHEN** un presupuesto tiene su tabla de ítems pero no trae sección de totales
- **THEN** se procesa normalmente, sin alertas de totales

### Requirement: Normalización por reglas
El sistema MUST resolver por reglas y catálogo el horario, tipo de montaje, pax y sección de cada ítem, y MUST tomar el lugar según el requisito "Lugar del evento". Lo resuelto MUST quedar "Regla"; lo que el presupuesto no trae, o trae como marcador vacío ("...", "-", en blanco), MUST quedar "Sin dato"; y el texto presente que no se pudo interpretar MUST quedar "Pendiente".

#### Scenario: Salón resuelto por alias
- **WHEN** el bloque dice "Salón: Topacio"
- **THEN** el lugar queda como "Topacio" con estado "Regla"

#### Scenario: Pax no numérico
- **WHEN** el bloque dice "N° Pax: ..."
- **THEN** el pax queda vacío con estado "Sin dato"

#### Scenario: Texto no interpretable
- **WHEN** el bloque dice "Horario: según programa del cliente" y no se puede interpretar como horario
- **THEN** el horario queda con estado "Pendiente" mostrando el texto original

### Requirement: Conciliación con el PDF digital
Cuando un evento se originó en un escaneo y luego se sube el PDF digital del mismo evento, el sistema MUST compararlos y MUST mostrar las diferencias en ítems, cantidades, montos, fechas, salones y totales impresos (subtotal, IVA, logística y total). Una diferencia de totales MUST mostrarse como alerta junto a las demás y MUST NOT marcar la conciliación como fallida ni impedir la carga o la generación. El sistema MUST ofrecer regenerar como nueva versión las B.E.O. afectadas.

#### Scenario: Digital sin diferencias
- **WHEN** el PDF digital coincide con lo leído del escaneo, incluidos los totales
- **THEN** el evento pasa a origen digital sin cambios en las B.E.O.

#### Scenario: Digital con un cambio
- **WHEN** el PDF digital tiene 3 asistentes de servicio en lugar de 2
- **THEN** se muestra esa diferencia y se ofrece regenerar la B.E.O. afectada como nueva versión

#### Scenario: Totales que no cuadran
- **WHEN** el subtotal o el total del PDF digital no coincide con el del escaneo y el resto de las filas sí
- **THEN** esa diferencia aparece junto a las demás alertas, la conciliación no falla y el presupuesto se guarda

## ADDED Requirements

### Requirement: Lugar del evento
El sistema MUST tomar el lugar del evento del texto del bloque del presupuesto, cualquiera que sea el espacio (salón, stand, piscina, habitación, cancha, área del lobby u otro), quitando solo la palabra "Salón" al inicio. El lugar MUST quedar "Regla" aunque no exista en el catálogo, y "Sin dato" si el bloque no trae lugar.

#### Scenario: Stand
- **WHEN** el bloque del presupuesto de Calox comienza con "Stand Calox"
- **THEN** el lugar queda como "Stand Calox" con estado "Regla"

#### Scenario: Piscina
- **WHEN** un bloque comienza con "Piscina"
- **THEN** el lugar queda como "Piscina" con estado "Regla"

#### Scenario: Salón con prefijo
- **WHEN** un bloque comienza con "Salón Zafiro"
- **THEN** el lugar queda como "Zafiro"

#### Scenario: Sin texto de lugar
- **WHEN** un bloque no trae ninguna línea de lugar antes del horario o el montaje
- **THEN** el lugar queda vacío con estado "Sin dato"

### Requirement: Avisos que no bloquean
«Ítem sin total» y la diferencia entre las noches del bloque y los días de la fecha MUST quedar como avisos. Esos avisos MUST NOT ser errores de estructura y MUST NOT impedir la carga ni la generación.

#### Scenario: Ítem sin total
- **WHEN** un ítem de la tabla no trae total
- **THEN** aparece el aviso «Ítem sin total» y el presupuesto se puede cargar y generar

#### Scenario: Noches distintas a los días
- **WHEN** un bloque indica 2 noches y la fecha cubre un solo día
- **THEN** aparece el aviso de noches y la generación sigue disponible
