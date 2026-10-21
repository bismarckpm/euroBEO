import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { isolatedDatabaseName, isolatedDatabaseUrl, maintenanceDatabaseUrl } from "./isolated-database";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const prismaCli = path.join("node_modules", "prisma", "build", "index.js");
const tsxCli = path.join("node_modules", "tsx", "dist", "cli.mjs");

function run(args: string[]): void {
  execFileSync(process.execPath, args, { stdio: "inherit" });
}

function runSql(databaseUrl: string, sql: string): void {
  execFileSync(process.execPath, [prismaCli, "db", "execute", "--stdin", "--url", databaseUrl], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function alreadyExists(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const stderr = "stderr" in error ? String(error.stderr ?? "") : "";
  const text = `${error.message}\n${stderr}`;
  return text.includes("already exists") || text.includes("P1009");
}

/** Vacía la base de la suite antes de migrar, para no depender de corridas anteriores. */
function isolateDatabase(): void {
  const current = process.env.DATABASE_URL;
  if (!current) {
    throw new Error("DATABASE_URL no está definida.");
  }
  const isolated = isolatedDatabaseUrl(current);
  process.env.DATABASE_URL = isolated;
  try {
    runSql(maintenanceDatabaseUrl(current), `CREATE DATABASE "${isolatedDatabaseName()}";`);
  } catch (error) {
    if (!alreadyExists(error)) throw error;
  }
  runSql(
    isolated,
    "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;",
  );
}

export default function globalSetup(): void {
  isolateDatabase();
  run([prismaCli, "migrate", "deploy"]);
  run([
    tsxCli,
    "scripts/seed-user.ts",
    "--username=asistente",
    "--password=prueba-local-123",
    "--name=Ana Pérez",
    "--title=Asistente de Ventas",
  ]);
  run([tsxCli, "prisma/seed-config.ts"]);
}
