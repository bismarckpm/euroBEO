import { existsSync } from "node:fs";
import { getPrisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function readArg(name: string): string {
  const flag = `--${name}`;
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    const value = inline.slice(flag.length + 1).trim();
    if (!value) {
      throw new Error(`Falta el argumento --${name}`);
    }
    return value;
  }

  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Falta el argumento --${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const username = readArg("username").trim();
  const password = readArg("password");
  const name = readArg("name").trim();
  const title = readArg("title").trim();

  if (!username || !password || !name || !title) {
    throw new Error("Usuario, contraseña, nombre y cargo son obligatorios.");
  }

  const prisma = getPrisma();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const passwordHash = await hashPassword(password);

  if (users.length > 1) {
    throw new Error("Hay más de un usuario. El sistema solo admite uno.");
  }

  const existing = users[0];
  if (existing && existing.username !== username) {
    throw new Error(
      `Ya existe el usuario "${existing.username}". Vuelve a ejecutar el script con ese usuario para actualizarlo.`,
    );
  }

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name, title },
    });
    console.log(`Usuario actualizado: ${username}`);
    return;
  }

  await prisma.user.create({
    data: { username, passwordHash, name, title },
  });
  console.log(`Usuario creado: ${username}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "No se pudo sembrar el usuario.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
