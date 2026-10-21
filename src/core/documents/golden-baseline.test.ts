import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertInsideContainer,
  assertLibreOfficeVersion,
  baselineMode,
  buildBaselineRecord,
  readGitCommit,
  writeApprovedBaseline,
} from "./golden-baseline";
import { centsFromAmount, printedDateToIso, staffPriceOverrides } from "./golden-cases";

describe("líneas base doradas", () => {
  it("convierte las fechas impresas a la fecha del borrador", () => {
    expect(printedDateToIso("22/10/26")).toBe("2026-10-22");
    expect(printedDateToIso("22.10.2026")).toBe("2026-10-22");
    expect(printedDateToIso("2026-10-22")).toBe("2026-10-22");
  });

  it("lee los precios ajustados de las líneas de personal", () => {
    expect(
      staffPriceOverrides([
        { group: "Montaje", lines: ["01 Ejemplo USD 1,50 c/u"] },
        { group: "Evento", lines: ["sin precio"] },
      ]),
    ).toEqual({ "Montaje|Ejemplo": 150 });
    expect(centsFromAmount("1.234,56")).toBe(123456);
  });

  it("rechaza guardar una línea base sin aprobador o sin motivo", () => {
    expect(() => baselineMode({ approve: "Ana", reason: "  " })).toThrow(/--approve y --reason/);
    expect(() => baselineMode({ reason: "Línea base inicial" })).toThrow(/--approve y --reason/);
    expect(baselineMode({}).kind).toBe("review");
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/golden-baseline.ts", "cata-eleaexeltis", "--approve", "Ana"],
      { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, EUROBEO_CONTAINER: "" } },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/--approve y --reason/);
  });

  it("rechaza el comando fuera del contenedor", () => {
    expect(() => assertInsideContainer({ NODE_ENV: "test" })).toThrow(/dentro del contenedor/);
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/golden-baseline.ts", "cata-eleaexeltis", "--approve", "Ana", "--reason", "prueba"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, EUROBEO_CONTAINER: "" },
      },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/dentro del contenedor/);
  });

  it("exige la serie de LibreOffice fijada", () => {
    expect(assertLibreOfficeVersion("LibreOffice 7.4.7.2 40(Build:2)\n")).toContain("LibreOffice 7.4");
    expect(() => assertLibreOfficeVersion("LibreOffice 24.2.0.0")).toThrow(/LibreOffice 7\.4/);
  });

  it("registra aprobador, motivo, commit, fecha y versión", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "eurobeo-git-"));
    const git = path.join(repo, ".git");
    const refDir = path.join(git, "refs", "heads");
    mkdirSync(refDir, { recursive: true });
    writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(path.join(refDir, "main"), "abc123\n");
    expect(readGitCommit(repo)).toBe("abc123");

    const caseDir = mkdtempSync(path.join(tmpdir(), "eurobeo-baseline-"));
    const reviewDir = path.join(caseDir, "review");
    mkdirSync(reviewDir, { recursive: true });
    writeFileSync(path.join(reviewDir, "0.955.png"), "png");
    const record = buildBaselineRecord({
      commit: "abc123",
      fecha: "2026-10-21T22:00:00.000Z",
      libreofficeVersion: "LibreOffice 7.4.7.2 40(Build:2)",
      motivo: "Línea base inicial",
      aprobadoPor: "Ana Pérez",
    });
    writeApprovedBaseline({ caseDir, reviewDir, stems: ["0.955"], record });
    expect(JSON.parse(readFileSync(path.join(caseDir, "baseline.json"), "utf8"))).toEqual(record);
    expect(readFileSync(path.join(caseDir, "baseline", "0.955.png"), "utf8")).toBe("png");
  });
});
