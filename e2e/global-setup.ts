import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const prismaCli = path.join("node_modules", "prisma", "build", "index.js");
const tsxCli = path.join("node_modules", "tsx", "dist", "cli.mjs");

function run(args: string[]): void {
  execFileSync(process.execPath, args, { stdio: "inherit" });
}

export default function globalSetup(): void {
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
