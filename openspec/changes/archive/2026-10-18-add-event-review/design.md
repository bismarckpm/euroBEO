# Design

## Context

Única usuaria, uso desde navegador de escritorio. La revisión es el paso donde se concentra el ahorro de tiempo: la asistente deja de transcribir y pasa a validar.

## Goals / Non-Goals

**Goals:**
- Que la asistente vea de un vistazo qué falta y lo resuelva rápido.
- Que la vista se parezca a la B.E.O. final para reducir errores.

**Non-Goals:**
- Vista previa exacta del Word (la da el PDF generado).
- Edición colaborativa.

## Decisions

- **Disposición en dos columnas** como la plantilla: izquierda A&B; derecha Bebidas, Accesos, Descorche, Sistemas, Mobiliario, Electricidad, Personal (con subgrupos).
- **Colores de estado:** sin marca = Regla; ámbar = IA (validar con un clic); rojo = Pendiente (obligatorio).
- **Guardado automático por campo** con auditoría; al corregir un campo que vino de normalización se ofrece "Recordar esta corrección".
- **Campos de evento compartidos** (cartelera, compañía, contacto) se editan una vez y se replican a todas las B.E.O.; se puede sobrescribir por B.E.O.
- **Unir/separar** opera sobre el borrador y vuelve a calcular la lista sin perder ediciones de líneas.

## Risks / Trade-offs

- Muchas B.E.O. en un evento grande pueden hacer la pantalla pesada. Mitigación: navegación lateral por día y salón, con contador de pendientes.
