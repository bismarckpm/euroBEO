import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { convertToPdf, findSoffice } from "./convert-pdf";
import {
  baselineNumbers,
  baselineStem,
  goldenRoot,
  loadGoldenPages,
  pendingLines,
  readCaseFinalValues,
  readManifest,
} from "./golden-cases";
import { renderDocx } from "./render-docx";

const exec = promisify(execFile);
const root = goldenRoot();

function commandExists(command: string): boolean {
  try {
    execFileSync(command, ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    return code !== "ENOENT";
  }
}

async function requireVisualTools(): Promise<void> {
  if (!(await findSoffice())) {
    throw new Error("Falta LibreOffice (soffice). Dentro del contenedor la comparación visual no se omite.");
  }
  if (!commandExists("pdftoppm")) {
    throw new Error("Falta pdftoppm. Dentro del contenedor la comparación visual no se omite.");
  }
}

function comparable(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replaceAll("\u00A0", " ");
  }
  if (Array.isArray(value)) {
    return value.map((entry) => comparable(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, comparable(entry)]),
    );
  }
  return value;
}

function diffFields(actual: unknown, expected: unknown, prefix = ""): string[] {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    return [];
  }
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object" || Array.isArray(actual) || Array.isArray(expected)) {
    return [`${prefix || "raíz"}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`];
  }
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  return [...keys].flatMap((key) =>
    diffFields(
      (actual as Record<string, unknown>)[key],
      (expected as Record<string, unknown>)[key],
      prefix ? `${prefix}.${key}` : key,
    ),
  );
}

async function expectCaseData(caseId: string): Promise<void> {
  const pages = await loadGoldenPages(caseId);
  const expectedRaw = JSON.parse(readFileSync(path.join(root, caseId, "expected.json"), "utf8")) as unknown;
  const actual = comparable(Array.isArray(expectedRaw) ? pages : pages[0]);
  const expected = comparable(expectedRaw);
  const fields = diffFields(actual, expected);
  expect(fields, fields.slice(0, 8).map((field) => field.split(":")[0]).join("\n")).toEqual([]);
}

describe("casos dorados", () => {
  it("lista los pendientes y exige línea base en los casos activos", () => {
    const cases = readManifest();
    const pending = pendingLines(cases);
    if (pending.length > 0) {
      console.info(["Casos dorados pendientes:", ...pending.map((line) => `- ${line}`)].join("\n"));
    }
    expect(cases.some((entry) => entry.id === "cata-eleaexeltis" && entry.status === "active")).toBe(true);
    expect(cases.some((entry) => entry.id === "scan-calox" && entry.status === "pending")).toBe(true);
    for (const entry of cases) {
      if (entry.status === "pending") {
        continue;
      }
      const caseDir = path.join(root, entry.id);
      expect(existsSync(path.join(caseDir, "presupuesto.pdf")), `${entry.id} presupuesto`).toBe(true);
      expect(existsSync(path.join(caseDir, "expected.json")), `${entry.id} expected`).toBe(true);
      expect(existsSync(path.join(caseDir, "final-values.json")), `${entry.id} final-values`).toBe(true);
      for (const number of baselineNumbers(entry.id, readCaseFinalValues(entry.id))) {
        const baseline = path.join(caseDir, "baseline", `${baselineStem(number)}.png`);
        if (!existsSync(baseline)) {
          throw new Error(`El caso ${entry.id} no tiene ${baselineStem(number)}.png. La prueba no genera la línea base.`);
        }
      }
    }
  });

  it("Reumatología 0.933 a 0.938 coincide con los datos esperados", async () => {
    const pages = comparable(await loadGoldenPages("reumatologia"));
    const expected = comparable(JSON.parse(readFileSync(path.join(root, "reumatologia", "expected.json"), "utf8")));
    const fields = diffFields(pages, expected);
    expect(fields, fields.slice(0, 8).map((field) => field.split(":")[0]).join("\n")).toEqual([]);
    expect(JSON.stringify(pages)).not.toContain("15/00/2026");
  });

  it("Nena 0.928 coincide con los datos esperados", async () => {
    await expectCaseData("nena");
  });

  it("la cata coincide con los datos de la B.E.O. 0.955/26", async () => {
    await expectCaseData("cata-eleaexeltis");
  });

  it("compara las imágenes activas con su línea base", async () => {
    await requireVisualTools();
    const template = readFileSync(path.join(process.cwd(), "templates", "beo.docx"));
    const active = readManifest().filter((entry) => entry.status === "active");
    for (const entry of active) {
      const pages = await loadGoldenPages(entry.id);
      for (const data of pages) {
        const stem = baselineStem(data.numero);
        const reference = path.join(root, entry.id, "baseline", `${stem}.png`);
        if (!existsSync(reference)) {
          throw new Error(`Falta la línea base ${entry.id}/${stem}.png. La prueba no la genera.`);
        }
        const pdf = await convertToPdf(renderDocx(template, data));
        const work = path.join(process.cwd(), "data", "golden-diff");
        mkdirSync(work, { recursive: true });
        const pdfPath = path.join(work, "page.pdf");
        writeFileSync(pdfPath, pdf);
        const actualStem = path.join(work, "page");
        await exec("pdftoppm", ["-png", "-r", "100", "-singlefile", pdfPath, actualStem]);
        const { default: pixelmatch } = await import("pixelmatch");
        const { PNG } = await import("pngjs");
        const expectedImage = PNG.sync.read(readFileSync(reference));
        const actualImage = PNG.sync.read(readFileSync(`${actualStem}.png`));
        expect(actualImage.width, reference).toBe(expectedImage.width);
        expect(actualImage.height, reference).toBe(expectedImage.height);
        const diff = new PNG({ width: expectedImage.width, height: expectedImage.height });
        const mismatched = pixelmatch(
          expectedImage.data,
          actualImage.data,
          diff.data,
          expectedImage.width,
          expectedImage.height,
          { threshold: 0.1 },
        );
        const ratio = mismatched / (expectedImage.width * expectedImage.height);
        if (ratio > 0.01) {
          writeFileSync(path.join(root, entry.id, `diff-${stem}.png`), PNG.sync.write(diff));
        }
        expect(ratio, reference).toBeLessThanOrEqual(0.01);
      }
    }
  }, 180_000);
});
