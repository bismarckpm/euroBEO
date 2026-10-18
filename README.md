# euroBEO

Aplicación interna del hotel Eurobuilding para generar órdenes de servicio (B.E.O.) y memorándums a partir del PDF de un presupuesto.

## Requisitos

- Node.js 24
- Docker con Compose, para PostgreSQL y el entorno completo (incluye LibreOffice)

## Configuración

Copia el ejemplo de variables y completa al menos la base de datos y el secreto de sesión (mínimo 32 caracteres):

```bash
copy .env.example .env
```

Si `OPENAI_API_KEY` queda vacía, la aplicación arranca y deja deshabilitada la normalización con IA.

## Google Drive

La subida es opcional. Sin credenciales, las B.E.O. y los memorándums se generan igual, quedan pendientes de subir y la revisión informa que Drive no está configurado. Un fallo de Drive no impide descargar los archivos.

Siempre se sube el `.docx`, sin convertirlo a Google Docs. El PDF solo se sube si `DRIVE_UPLOAD_PDF=true`.

### Cuenta de servicio

1. En Google Cloud, crea o elige un proyecto y habilita la API de Google Drive.
2. Crea una cuenta de servicio y descarga su clave JSON.
3. Pega ese JSON en una sola línea en `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. En Drive, comparte la carpeta raíz de las B.E.O. con el correo de la cuenta de servicio (`client_email`) como editor.
5. El id de esa carpeta es el tramo de la URL entre `/folders/` y el siguiente `/` o `?`. Pégalo en `DRIVE_ROOT_FOLDER_ID`.

Dentro de esa carpeta, la aplicación busca una carpeta con el año en curso en hora de Caracas (por ejemplo `2026`) y la crea si no existe. No borra ni reemplaza archivos: si el nombre ya está, sube el siguiente sufijo libre (`v2`, `v3`…).

### OAuth

Si el hotel no permite cuentas de servicio, crea un cliente OAuth, autoriza el alcance `https://www.googleapis.com/auth/drive` y conserva el refresh token. Hay que informar las tres variables juntas, además de `DRIVE_ROOT_FOLDER_ID`:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`

Si están la cuenta de servicio y OAuth, se usa la cuenta de servicio. Las credenciales solo viven en el entorno: no se guardan en la base ni se muestran en la pantalla. `GOOGLE_DRIVE_FOLDER_ID` se acepta como alias de `DRIVE_ROOT_FOLDER_ID`.

## Desarrollo local

Levanta solo la base de datos (publicada en el puerto 5433 del equipo, para no chocar con otro PostgreSQL en el 5432), aplica las migraciones y crea la usuaria:

```bash
docker compose up db -d
npm install
npx prisma migrate deploy
npm run seed:user -- --username=asistente --password=una-clave --name="Ana Pérez" --title="Asistente de Ventas"
npm run dev
```

La aplicación queda en `http://localhost:3000`.

## Entorno completo

`docker compose up --build` levanta PostgreSQL (con volumen persistente) y la aplicación. Al arrancar, el contenedor aplica las migraciones. La imagen incluye LibreOffice headless. Cuando se conozcan las fuentes de la plantilla del hotel, colócalas en `docker/fonts/` antes de construir.

Para crear la usuaria contra la base del compose:

```bash
npm run seed:user -- --username=asistente --password=una-clave --name="Ana Pérez" --title="Asistente de Ventas"
```

Ese comando usa el `DATABASE_URL` de `.env` (`localhost`). El servicio `app` se conecta por el host `db`.

## Verificar LibreOffice

Dentro del contenedor de la aplicación:

```bash
docker compose exec app npm run verify:docx
```

El script arma un `.docx` de prueba, lo convierte a PDF con un perfil temporal de LibreOffice y comprueba que el resultado es un PDF.

## Pruebas

```bash
npm test
npm run lint
npm run typecheck
npm run test:e2e
```

Las pruebas de extremo a extremo necesitan la base de datos en marcha y Playwright Chromium (`npx playwright install chromium`).

## Datos reales

Los presupuestos y B.E.O. de clientes van en `fixtures/` y no se versionan. Qué copiar está descrito en `fixtures/README.md`.
