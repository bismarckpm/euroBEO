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
