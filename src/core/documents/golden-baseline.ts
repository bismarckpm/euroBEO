import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Serie fijada en la imagen Docker (Debian bookworm, libreoffice-writer). */
export const EXPECTED_LIBREOFFICE_PREFIX = "LibreOffice 7.4";

export type BaselineMode = { kind: "review" } | { kind: "approve"; aprobadoPor: string; motivo: string };

export type BaselineRecord = {
  commit: string;
  fecha: string;
  libreofficeVersion: string;
  motivo: string;
  aprobadoPor: string;
};

function readFlag(argv: string[], name: string): string | undefined {
  const flag = `--${name}`;
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }
  const index = argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return argv[index + 1];
}

export function parseBaselineArgs(argv: string[]): { caseId: string; approve?: string; reason?: string } {
  const approve = readFlag(argv, "approve");
  const reason = readFlag(argv, "reason");
  const consumed = new Set<number>();
  argv.forEach((arg, index) => {
    if (arg === "--approve" || arg === "--reason") {
      consumed.add(index);
      consumed.add(index + 1);
    } else if (arg.startsWith("--approve=") || arg.startsWith("--reason=")) {
      consumed.add(index);
    }
  });
  const positional = argv.filter((arg, index) => !consumed.has(index) && !arg.startsWith("-"));
  if (positional.length !== 1 || !positional[0]) {
    throw new Error("Indica un solo caso: npm run golden:baseline -- <caso>");
  }
  return { caseId: positional[0], approve, reason };
}

export function baselineMode(args: { approve?: string; reason?: string }): BaselineMode {
  const aprobadoPor = args.approve?.trim() ?? "";
  const motivo = args.reason?.trim() ?? "";
  if (!aprobadoPor && !motivo) {
    return { kind: "review" };
  }
  if (!aprobadoPor || !motivo) {
    throw new Error("Hace falta --approve y --reason para guardar la línea base.");
  }
  return { kind: "approve", aprobadoPor, motivo };
}

export function assertInsideContainer(env: NodeJS.ProcessEnv = process.env): void {
  if (env.EUROBEO_CONTAINER !== "1") {
    throw new Error("Las líneas base solo se generan dentro del contenedor.");
  }
}

export function assertLibreOfficeVersion(versionText: string): string {
  const line = versionText
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("LibreOffice ")) ?? "";
  if (!line.startsWith(EXPECTED_LIBREOFFICE_PREFIX)) {
    throw new Error(
      `LibreOffice debe ser ${EXPECTED_LIBREOFFICE_PREFIX}. Se encontró: ${line || "desconocida"}. Al actualizarla hay que regenerar y aprobar las líneas base.`,
    );
  }
  return line;
}

export function libreOfficeVersion(): string {
  const output = execFileSync("soffice", ["--version"], { encoding: "utf8" });
  return assertLibreOfficeVersion(output);
}

export function readGitCommit(repoRoot: string): string {
  const gitEntry = path.join(repoRoot, ".git");
  if (!existsSync(gitEntry)) {
    throw new Error("No se puede registrar el commit: falta .git en el contenedor.");
  }
  let gitDir = gitEntry;
  if (statSync(gitEntry).isFile()) {
    const pointer = /^gitdir:\s*(.+)$/.exec(readFileSync(gitEntry, "utf8").trim());
    if (!pointer?.[1]) {
      throw new Error("No se puede registrar el commit: .git no apunta a un directorio.");
    }
    gitDir = path.resolve(path.dirname(gitEntry), pointer[1]);
  }
  const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
  if (!head.startsWith("ref: ")) {
    return head;
  }
  const ref = head.slice("ref: ".length).trim();
  const refFile = path.join(gitDir, ref);
  if (existsSync(refFile)) {
    return readFileSync(refFile, "utf8").trim();
  }
  const packed = path.join(gitDir, "packed-refs");
  if (existsSync(packed)) {
    for (const packedLine of readFileSync(packed, "utf8").split("\n")) {
      if (!packedLine || packedLine.startsWith("#") || packedLine.startsWith("^")) {
        continue;
      }
      const [hash, name] = packedLine.split(" ");
      if (name === ref && hash) {
        return hash;
      }
    }
  }
  throw new Error("No se puede registrar el commit: la referencia HEAD no está resuelta.");
}

export function buildBaselineRecord(input: BaselineRecord): BaselineRecord {
  for (const [key, value] of Object.entries(input)) {
    if (!value.trim()) {
      throw new Error(`El registro de la línea base no tiene ${key}.`);
    }
  }
  return { ...input };
}

export function writeApprovedBaseline(options: {
  caseDir: string;
  reviewDir: string;
  stems: string[];
  record: BaselineRecord;
}): void {
  const baselineDir = path.join(options.caseDir, "baseline");
  mkdirSync(baselineDir, { recursive: true });
  for (const stem of options.stems) {
    const source = path.join(options.reviewDir, `${stem}.png`);
    if (!existsSync(source)) {
      throw new Error(`Falta el raster de revisión ${stem}.png.`);
    }
    copyFileSync(source, path.join(baselineDir, `${stem}.png`));
  }
  writeFileSync(path.join(options.caseDir, "baseline.json"), `${JSON.stringify(options.record, null, 2)}\n`, "utf8");
}
