import { describe, expect, it } from "vitest";
import { archiveDocument, driveRecord, DriveArchiveError } from "./archive";
import type { DriveClient } from "./client";
import { createMemoryDrive } from "./memory";
import { DOCX_MIME, PDF_MIME, driveYear, nextVersionedName } from "./names";

const original = "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO.docx";
const in2027 = new Date("2027-06-15T16:00:00.000Z");

function failUploads(client: DriveClient, times: number): DriveClient {
  let remaining = times;
  return {
    findFolder: (parentId, name) => client.findFolder(parentId, name),
    createFolder: (parentId, name) => client.createFolder(parentId, name),
    listNames: (folderId) => client.listNames(folderId),
    upload: async (input) => {
      if (remaining > 0) {
        remaining -= 1;
        throw new Error("Drive no responde");
      }
      return client.upload(input);
    },
  };
}

describe("carpeta del año", () => {
  it("usa el año de Caracas", () => {
    expect(driveYear(new Date("2027-01-01T03:59:00.000Z"))).toBe("2026");
    expect(driveYear(new Date("2027-01-01T04:00:00.000Z"))).toBe("2027");
  });

  it("crea la carpeta 2027 y sube el .docx sin convertirlo", async () => {
    const drive = createMemoryDrive();
    const archived = await archiveDocument({
      client: drive.client,
      rootFolderId: "raiz",
      now: in2027,
      fileName: original,
      docx: Buffer.from("docx"),
      pdf: Buffer.from("pdf"),
      uploadPdf: false,
      wait: async () => undefined,
    });

    expect(drive.folders).toEqual([{ id: "folder-1", name: "2027", parentId: "raiz" }]);
    expect(archived.folderId).toBe("folder-1");
    expect(archived.name).toBe(original);
    expect(drive.files).toHaveLength(1);
    expect(drive.files[0]?.mimeType).toBe(DOCX_MIME);
    expect(drive.files[0]?.name.endsWith(".docx")).toBe(true);
  });

  it("reutiliza la carpeta del año si ya existe", async () => {
    const drive = createMemoryDrive();
    await drive.client.createFolder("raiz", "2027");
    await archiveDocument({
      client: drive.client,
      rootFolderId: "raiz",
      now: in2027,
      fileName: "B.E.O. 0.841 EVENTO.docx",
      docx: Buffer.from("docx"),
      uploadPdf: false,
      wait: async () => undefined,
    });
    expect(drive.folders.filter((folder) => folder.name === "2027")).toHaveLength(1);
  });
});

describe("versiones", () => {
  it("elige el siguiente sufijo libre", () => {
    expect(nextVersionedName([], original)).toBe(original);
    expect(nextVersionedName([original], original)).toBe(
      "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v2.docx",
    );
    expect(nextVersionedName([original, original.replace(".docx", " v2.docx")], original)).toBe(
      "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v3.docx",
    );
  });

  it("sube v2 y conserva el archivo original", async () => {
    const drive = createMemoryDrive();
    const folder = await drive.client.createFolder("raiz", "2027");
    await drive.client.upload({
      folderId: folder.id,
      name: original,
      mimeType: DOCX_MIME,
      body: Buffer.from("original"),
    });

    const archived = await archiveDocument({
      client: drive.client,
      rootFolderId: "raiz",
      now: in2027,
      fileName: original,
      docx: Buffer.from("nueva"),
      uploadPdf: false,
      wait: async () => undefined,
    });

    expect(archived.name).toBe("B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v2.docx");
    const names = drive.files.map((file) => file.name);
    expect(names).toContain(original);
    expect(names).toContain("B.E.O. 0.840 CONGRESO PETS - INNOVAGRO v2.docx");
    expect(drive.files.find((file) => file.name === original)?.body.toString()).toBe("original");
  });
});

describe("formato y reintentos", () => {
  it("sube el PDF solo cuando está activado", async () => {
    const drive = createMemoryDrive();
    await archiveDocument({
      client: drive.client,
      rootFolderId: "raiz",
      now: in2027,
      fileName: original,
      docx: Buffer.from("docx"),
      pdf: Buffer.from("pdf"),
      uploadPdf: true,
      wait: async () => undefined,
    });
    expect(drive.files.map((file) => file.mimeType)).toEqual([DOCX_MIME, PDF_MIME]);
    expect(drive.files.map((file) => file.name)).toEqual([
      original,
      "B.E.O. 0.840 CONGRESO PETS - INNOVAGRO.pdf",
    ]);
  });

  it("reintenta con espera creciente y deja el archivo disponible tras el error", async () => {
    const drive = createMemoryDrive();
    const waits: number[] = [];
    await expect(
      archiveDocument({
        client: failUploads(drive.client, 5),
        rootFolderId: "raiz",
        now: in2027,
        fileName: original,
        docx: Buffer.from("docx"),
        uploadPdf: false,
        wait: async (milliseconds) => {
          waits.push(milliseconds);
        },
      }),
    ).rejects.toBeInstanceOf(DriveArchiveError);
    expect(waits).toEqual([1_000, 2_000]);
    expect(drive.files).toHaveLength(0);

    const retried = await archiveDocument({
      client: drive.client,
      rootFolderId: "raiz",
      now: in2027,
      fileName: original,
      docx: Buffer.from("docx"),
      uploadPdf: false,
      wait: async () => undefined,
    });
    expect(retried.status).toBe("subido");
    expect(retried.url).toContain("drive.google.com");
    expect(drive.files).toHaveLength(1);
  });

  it("registra el enlace al tercer intento y no guarda credenciales", async () => {
    const drive = createMemoryDrive();
    const archived = await archiveDocument({
      client: failUploads(drive.client, 2),
      rootFolderId: "raiz",
      now: in2027,
      fileName: original,
      docx: Buffer.from("docx"),
      uploadPdf: false,
      wait: async () => undefined,
    });
    const record = driveRecord(0, { ok: true, attempts: archived.attempts, url: archived.url });
    expect(archived.attempts).toBe(3);
    expect(record).toEqual({
      driveStatus: "subido",
      driveUrl: archived.url,
      driveAttempts: 3,
    });
    expect(Object.keys(record)).toEqual(["driveStatus", "driveUrl", "driveAttempts"]);
    expect(driveRecord(3, { ok: false, attempts: 3 })).toEqual({
      driveStatus: "error",
      driveUrl: null,
      driveAttempts: 6,
    });
  });
});
