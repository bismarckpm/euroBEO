# platform-foundation Specification

## Purpose

Base técnica del generador de B.E.O.: estructura del proyecto, base de datos, contenedores, configuración, auditoría y herramientas de prueba sobre las que se construyen las demás capacidades.

## Requirements

### Requirement: Despliegue local con Docker Compose
El sistema MUST poder levantarse completo en un equipo local con un solo comando de Docker Compose, con un servicio de aplicación (Node LTS con LibreOffice headless) y un servicio de PostgreSQL con volumen persistente.

#### Scenario: Arranque desde cero
- **WHEN** se ejecuta `docker compose up` con un archivo `.env` completo
- **THEN** la base de datos queda migrada y la aplicación responde en el puerto configurado

#### Scenario: Persistencia de datos
- **WHEN** se detienen y vuelven a levantar los contenedores
- **THEN** los datos guardados previamente siguen disponibles

### Requirement: Configuración por variables de entorno
El sistema MUST leer su configuración sensible (conexión a base de datos, secreto de sesión, clave de OpenAI, credenciales de Google Drive) desde variables de entorno validadas al arrancar, y MUST incluir un `.env.example` documentado.

#### Scenario: Variable obligatoria faltante
- **WHEN** la aplicación arranca sin `DATABASE_URL` o sin `SESSION_SECRET`
- **THEN** el arranque falla con un mensaje que indica qué variable falta

#### Scenario: Variable opcional faltante
- **WHEN** la aplicación arranca sin la clave de OpenAI
- **THEN** la aplicación arranca y registra que la normalización con IA estará deshabilitada

### Requirement: Lógica de negocio aislada
La lógica de negocio MUST residir en `src/core` como módulos TypeScript sin dependencias de Next.js, de modo que pueda probarse con Vitest sin levantar el servidor web.

#### Scenario: Prueba unitaria de dominio
- **WHEN** se ejecuta `npm test`
- **THEN** las pruebas de `src/core` corren sin iniciar Next.js ni la base de datos

### Requirement: Registro de auditoría
El sistema MUST registrar en una tabla de auditoría cada acción relevante (carga, edición, generación, subida, llamada a IA) con tipo de acción, entidad, identificador, valor anterior, valor nuevo y fecha.

#### Scenario: Registro de una edición
- **WHEN** un módulo invoca el helper de auditoría con una edición de campo
- **THEN** queda una fila con el valor anterior, el valor nuevo y la fecha

### Requirement: Datos reales fuera del control de versiones
El proyecto MUST excluir de git la carpeta `fixtures/`, que contiene presupuestos y B.E.O. reales con datos de clientes.

#### Scenario: Fixtures ignorados
- **WHEN** se agrega un PDF dentro de `fixtures/`
- **THEN** git no lo muestra como archivo para versionar

### Requirement: Servicio de OCR en el despliegue local
Docker Compose MUST incluir un servicio de OCR (Python con OpenCV y Tesseract con el idioma español) accesible solo desde la aplicación dentro de la red interna, y la aplicación MUST seguir funcionando para PDF digitales si el servicio de OCR no está disponible.

#### Scenario: OCR caído
- **WHEN** el servicio de OCR no responde y se sube un PDF escaneado
- **THEN** el sistema informa que el escaneo no se puede procesar en ese momento y los PDF digitales siguen funcionando
