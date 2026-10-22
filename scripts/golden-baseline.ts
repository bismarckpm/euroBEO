import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { convertToPdf } from "../src/core/documents/convert-pdf";
import {
  assertInsideContainer,
  baselineMode,
  buildBaselineRecord,
  libreOfficeVersion,
  parseBaselineArgs,
  readGitCommit,
  writeApprovedBaseline,
} from "../src/core/documents/golden-baseline";
import { baselineStem, goldenRoot, loadGoldenPages, pendingLines, readManifest } from "../src/core/documents/golden-cases";
import { renderDocx } from "../src/core/documents/render-docx";

const exec = promisify(execFile);

async function rasterize(pdfPath: string, stemPath: string): Promise<void> {
  await exec("pdftoppm", ["-png", "-r", "100", "-singlefile", pdfPath, stemPath]);
}

async function main(): Promise<void> {
  const args = parseBaselineArgs(process.argv.slice(2));
  const mode = baselineMode(args);
  assertInsideContainer();
  const version = libreOfficeVersion();
  const root = goldenRoot();
  const manifest = readManifest(root);
  const entry = manifest.find((item) => item.id === args.caseId);
  if (!entry) {
    throw new Error(`El caso ${args.caseId} no está en el manifiesto.`);
  }
  if (entry.status === "pending") {
    throw new Error(`El caso ${args.caseId} está pendiente (${entry.reason}). No se genera línea base.`);
  }

  const caseDir = path.join(root, args.caseId);
  const reviewDir = path.join(caseDir, "review");
  rmSync(reviewDir, { recursive: true, force: true });
  mkdirSync(reviewDir, { recursive: true });

  const template = readFileSync(path.join(process.cwd(), "templates", "beo.docx"));
  const pages = await loadGoldenPages(args.caseId, root);
  const stems: string[] = [];
  for (const page of pages) {
    const stem = baselineStem(page.numero);
    stems.push(stem);
    const pdfPath = path.join(reviewDir, `${stem}.pdf`);
    writeFileSync(pdfPath, await convertToPdf(renderDocx(template, page)));
    await rasterize(pdfPath, path.join(reviewDir, stem));
  }

  if (mode.kind === "review") {
    const pending = pendingLines(manifest);
    console.log(`Revisión de ${args.caseId} en ${reviewDir}. Para guardarla: --approve "<nombre>" --reason "<motivo>".`);
    if (pending.length > 0) {
      console.log(`Pendientes:\n${pending.join("\n")}`);
    }
    return;
  }

  const record = buildBaselineRecord({
    commit: readGitCommit(process.cwd()),
    fecha: new Date().toISOString(),
    libreofficeVersion: version,
    motivo: mode.motivo,
    aprobadoPor: mode.aprobadoPor,
  });
  writeApprovedBaseline({ caseDir, reviewDir, stems, record });
  console.log(`Línea base de ${args.caseId} aprobada por ${record.aprobadoPor}.`);
}

const invoked = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (invoked) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "No se pudo generar la línea base.";
    console.error(message);
    process.exitCode = 1;
  });
}
