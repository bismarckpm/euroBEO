import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { domainModules } from "./index";

async function typescriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await typescriptFiles(fullPath)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("src/core", () => {
  it("expone los módulos de dominio previstos", () => {
    expect(domainModules).toContain("budget");
    expect(domainModules).toContain("documents");
  });

  it("no importa Next.js ni la base de datos", async () => {
    const files = await typescriptFiles(path.resolve("src/core"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source).not.toMatch(/from ["']next/);
      expect(source).not.toMatch(/@prisma\/client/);
    }
  });
});
