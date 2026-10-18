import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ZipEntry = { name: string; data: Buffer };

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    parts.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + entry.data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralDir, end]);
}

function sampleDocx(): Buffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Eurobuilding verificacion</w:t></w:r></w:p></w:body>
</w:document>`;

  return zipStore([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes) },
    { name: "_rels/.rels", data: Buffer.from(rels) },
    { name: "word/document.xml", data: Buffer.from(document) },
  ]);
}

async function convert(binary: string, docxPath: string, outDir: string, profile: string): Promise<void> {
  await execFileAsync(
    binary,
    [
      "--headless",
      "--norestore",
      "--nolockcheck",
      "--nologo",
      `-env:UserInstallation=file://${profile}`,
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      docxPath,
    ],
    { timeout: 60_000 },
  );
}

async function main(): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), "eurobeo-docx-"));
  const profile = await mkdtemp(join(tmpdir(), "eurobeo-lo-"));
  const docxPath = join(workDir, "muestra.docx");
  const pdfPath = join(workDir, "muestra.pdf");

  try {
    await writeFile(docxPath, sampleDocx());
    let converted = false;
    let lastError: unknown;
    for (const binary of ["soffice", "libreoffice"]) {
      try {
        await convert(binary, docxPath, workDir, profile);
        converted = true;
        break;
      } catch (error) {
        lastError = error;
        const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
        if (code !== "ENOENT") {
          break;
        }
      }
    }
    if (!converted) {
      throw lastError instanceof Error ? lastError : new Error("No se encontró LibreOffice.");
    }

    const pdf = await readFile(pdfPath);
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("La conversión no produjo un PDF válido.");
    }
    console.log("Conversión correcta: el .docx de prueba se convirtió a PDF.");
  } finally {
    await rm(workDir, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Falló la conversión a PDF.";
  console.error(message);
  process.exitCode = 1;
});
