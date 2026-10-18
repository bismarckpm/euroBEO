# Spec Delta

## Purpose

Acceso protegido a la herramienta para su única usuaria, la asistente de ventas, y gestión de su nombre y cargo usados como firma.

## ADDED Requirements

### Requirement: Inicio de sesión con usuario único
El sistema MUST exigir usuario y contraseña para acceder a cualquier página o ruta de API, salvo la página de inicio de sesión, y MUST NOT ofrecer registro público ni roles.

#### Scenario: Acceso sin sesión
- **WHEN** alguien abre una página interna sin sesión activa
- **THEN** es redirigido a la página de inicio de sesión

#### Scenario: Credenciales correctas
- **WHEN** la usuaria ingresa usuario y contraseña válidos
- **THEN** se crea una sesión en cookie httpOnly y accede a la pantalla principal

#### Scenario: Credenciales incorrectas
- **WHEN** se ingresa una contraseña incorrecta
- **THEN** se muestra un mensaje genérico sin indicar qué dato falló

### Requirement: Creación del usuario por script
El usuario MUST crearse mediante un script de siembra que reciba usuario, contraseña, nombre y cargo, y MUST guardar la contraseña con hash.

#### Scenario: Siembra inicial
- **WHEN** se ejecuta el script de siembra con los datos de la asistente
- **THEN** existe un único usuario con la contraseña almacenada como hash

### Requirement: Perfil de firma
La usuaria MUST poder ver y editar su nombre y cargo; estos datos MUST usarse como firmante de los memorándums.

#### Scenario: Cambio de cargo
- **WHEN** la usuaria actualiza su cargo en el perfil
- **THEN** los memorándums generados a partir de ese momento muestran el nuevo cargo

### Requirement: Cierre de sesión
El sistema MUST permitir cerrar sesión y MUST invalidar la cookie de sesión.

#### Scenario: Cerrar sesión
- **WHEN** la usuaria pulsa "Cerrar sesión"
- **THEN** la sesión se invalida y vuelve a la página de inicio de sesión
