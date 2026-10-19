import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class PdfConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfConversionError";
  }
}

let queue: Promise<void> = Promise.resolve();

async function exists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

/** Busca LibreOffice en la variable de entorno, en Windows y en el PATH. */
export async function findSoffice(): Promise<string | null> {
  const fromEnv = process.env.SOFFICE_PATH;
  if (fromEnv && (await exists(fromEnv))) {
    return fromEnv;
  }
  const windows = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  for (const candidate of windows) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  for (const command of ["soffice", "libreoffice"]) {
    try {
      await execFileAsync(command, ["--version"], { timeout: 15_000 });
      return command;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") {
        return command;
      }
    }
  }
  return null;
}

function profileUri(profile: string): string {
  const normalized = profile.replaceAll("\\", "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}

const SOFFICE_ARGS = ["--headless", "--norestore", "--nolockcheck", "--nologo"] as const;

async function readPdf(pdfPath: string): Promise<Buffer> {
  const pdf = await readFile(pdfPath);
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new PdfConversionError("La conversión no produjo un PDF válido.");
  }
  return pdf;
}

async function convertLocal(binary: string, docx: Buffer): Promise<Buffer> {
  const workDir = await mkdtemp(path.join(tmpdir(), "eurobeo-docx-"));
  const profile = await mkdtemp(path.join(tmpdir(), "eurobeo-lo-"));
  try {
    const docxPath = path.join(workDir, "beo.docx");
    await writeFile(docxPath, docx);
    await execFileAsync(
      binary,
      [
        ...SOFFICE_ARGS,
        `-env:UserInstallation=${profileUri(profile)}`,
        "--convert-to",
        "pdf",
        "--outdir",
        workDir,
        docxPath,
      ],
      { timeout: 120_000 },
    );
    return await readPdf(path.join(workDir, "beo.pdf"));
  } finally {
    await rm(workDir, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
}

async function dockerLibreOffice(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["image", "inspect", "eurobeo-app:latest"], { timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

/** Usa la imagen de la aplicación cuando el equipo no tiene LibreOffice instalado. */
async function convertInDocker(docx: Buffer): Promise<Buffer> {
  const workDir = await mkdtemp(path.join(tmpdir(), "eurobeo-docx-"));
  try {
    await mkdir(path.join(workDir, "profile"));
    await writeFile(path.join(workDir, "beo.docx"), docx);
    await execFileAsync(
      "docker",
      [
        "run",
        "--rm",
        "--entrypoint",
        "soffice",
        "-v",
        `${workDir}:/work`,
        "eurobeo-app:latest",
        ...SOFFICE_ARGS,
        "-env:UserInstallation=file:///work/profile",
        "--convert-to",
        "pdf",
        "--outdir",
        "/work",
        "/work/beo.docx",
      ],
      { timeout: 120_000 },
    );
    return await readPdf(path.join(workDir, "beo.pdf"));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function convertOne(docx: Buffer): Promise<Buffer> {
  const binary = await findSoffice();
  try {
    if (binary) {
      return await convertLocal(binary, docx);
    }
    if (await dockerLibreOffice()) {
      return await convertInDocker(docx);
    }
    throw new PdfConversionError("No se encontró LibreOffice para convertir la B.E.O. a PDF.");
  } catch (error) {
    if (error instanceof PdfConversionError) {
      throw error;
    }
    throw new PdfConversionError("No se pudo convertir la B.E.O. a PDF.");
  }
}

/** Una conversión a la vez, cada una con su perfil temporal. */
export function convertToPdf(docx: Buffer): Promise<Buffer> {
  const run = queue.then(() => convertOne(docx));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
