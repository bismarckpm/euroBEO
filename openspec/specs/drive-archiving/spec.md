# drive-archiving Specification

## Purpose

Archivo automático en Google Drive de las B.E.O. y memorándums generados, en formato editable, dentro de la carpeta del año en curso y con versionado al regenerar.

## Requirements

### Requirement: Subida automática a la carpeta del año
Tras generar los documentos de un evento, el sistema MUST subir cada B.E.O. y memorándum en .docx editable a la carpeta del año en curso dentro de la carpeta raíz configurada, y MUST crear la carpeta del año si no existe.

#### Scenario: Primera B.E.O. del año
- **WHEN** se genera la primera B.E.O. de 2027 y no existe la carpeta "2027"
- **THEN** el sistema crea la carpeta y sube la B.E.O. en ella

#### Scenario: Formato editable
- **WHEN** se sube una B.E.O.
- **THEN** el archivo en Drive es un .docx sin conversión a otro formato

### Requirement: Versiones al regenerar
Si se regenera un documento cuyo nombre ya existe en la carpeta, el sistema MUST subirlo como nueva versión con sufijo (v2, v3…) y MUST NOT borrar ni reemplazar la versión anterior.

#### Scenario: Segunda versión
- **WHEN** se regenera la B.E.O. 0.840 de Congreso Pets
- **THEN** se sube "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v2.docx" y la original se conserva

### Requirement: Estado de subida y reintento
El sistema MUST mostrar el estado de subida de cada documento (pendiente, subido, error), MUST permitir reintentar ante un error y MUST mantener los documentos disponibles para descarga aunque la subida falle.

#### Scenario: Falla de conexión
- **WHEN** Drive no responde al subir un documento
- **THEN** el documento queda en estado "error", se puede reintentar y sigue disponible para descarga

#### Scenario: Subida exitosa
- **WHEN** un documento se sube correctamente
- **THEN** su estado es "subido" y muestra el enlace al archivo en Drive

### Requirement: Credenciales protegidas
Las credenciales de Google Drive MUST configurarse por variables de entorno y MUST NOT almacenarse en la base de datos ni mostrarse en la interfaz.

#### Scenario: Sin credenciales
- **WHEN** no hay credenciales de Drive configuradas
- **THEN** la generación funciona, los documentos quedan en estado "pendiente" y se informa que Drive no está configurado
