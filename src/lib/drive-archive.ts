import { readFile } from "node:fs/promises";
import { archiveDocument, DriveArchiveError, driveRecord } from "../core/drive/archive";
import type { DriveClient } from "../core/drive/client";
import { getPrisma } from "./db";
import { driveSettings, parseEnv, type AppEnv } from "./env";
import { ReviewError } from "./event-review";
import { createGoogleDriveClient } from "./google-drive";

export const DRIVE_NOT_CONFIGURED = "Drive no está configurado.";

export type PublicDriveState = {
  driveStatus: string;
  driveUrl: string | null;
};

export type DrivePublication = {
  configured: boolean;
  message: string | null;
  byId: Record<string, PublicDriveState>;
};

type UploadOptions = {
  now?: Date;
  client?: DriveClient;
  wait?: (milliseconds: number) => Promise<void>;
};

type DriveConfig = {
  env: AppEnv;
  rootFolderId: string;
  uploadPdf: boolean;
};

function readConfig(): DriveConfig | null {
  try {
    const env = parseEnv(process.env);
    const settings = driveSettings(env);
    if (!settings.configured || !settings.rootFolderId) {
      return null;
    }
    return { env, rootFolderId: settings.rootFolderId, uploadPdf: settings.uploadPdf };
  } catch {
    return null;
  }
}

function clientFor(config: DriveConfig, options?: UploadOptions): DriveClient {
  if (options?.client) {
    return options.client;
  }
  const settings = driveSettings(config.env);
  if (settings.mode === "service-account") {
    return createGoogleDriveClient({ serviceAccountJson: config.env.GOOGLE_SERVICE_ACCOUNT_JSON });
  }
  return createGoogleDriveClient({
    oauth: {
      clientId: config.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      clientSecret: config.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      refreshToken: config.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "",
    },
  });
}

export function currentDriveMessage(): string | null {
  return readConfig() ? null : DRIVE_NOT_CONFIGURED;
}

/** Sube documentos ya generados. Si Drive no está configurado, los deja en pendiente. */
export async function publishGeneratedDocuments(
  ids: string[],
  options?: UploadOptions,
): Promise<DrivePublication> {
  const pending = Object.fromEntries(
    ids.map((id) => [id, { driveStatus: "pendiente", driveUrl: null }]),
  );
  const config = readConfig();
  if (!config) {
    return { configured: false, message: DRIVE_NOT_CONFIGURED, byId: pending };
  }
  const setup = { ...config, client: clientFor(config, options) };
  const byId: Record<string, PublicDriveState> = {};
  for (const id of ids) {
    byId[id] = await uploadStored(id, setup, options);
  }
  return { configured: true, message: null, byId };
}

export async function retryGeneratedDocument(
  eventId: string,
  documentId: string,
  options?: UploadOptions,
): Promise<DrivePublication> {
  const row = await getPrisma().generatedDocument.findFirst({
    where: { id: documentId, eventId },
    select: { id: true },
  });
  if (!row) {
    throw new ReviewError("No se encontró el documento.", 404);
  }
  return publishGeneratedDocuments([documentId], options);
}

async function uploadStored(
  id: string,
  setup: DriveConfig & { client: DriveClient },
  options?: UploadOptions,
): Promise<PublicDriveState> {
  const row = await getPrisma().generatedDocument.findUnique({ where: { id } });
  if (!row) {
    return { driveStatus: "pendiente", driveUrl: null };
  }
  let docx: Buffer;
  try {
    docx = await readFile(row.docxPath);
  } catch {
    const record = driveRecord(row.driveAttempts, { ok: false, attempts: 1 });
    await getPrisma().generatedDocument.update({ where: { id }, data: record });
    return { driveStatus: record.driveStatus, driveUrl: record.driveUrl };
  }
  let pdf: Buffer | null = null;
  if (setup.uploadPdf) {
    try {
      pdf = await readFile(row.pdfPath);
    } catch {
      pdf = null;
    }
  }
  try {
    const archived = await archiveDocument({
      client: setup.client,
      rootFolderId: setup.rootFolderId,
      now: options?.now ?? new Date(),
      fileName: row.fileName,
      docx,
      pdf,
      uploadPdf: setup.uploadPdf && pdf !== null,
      wait: options?.wait,
    });
    const record = driveRecord(row.driveAttempts, {
      ok: true,
      attempts: archived.attempts,
      url: archived.url,
    });
    await getPrisma().generatedDocument.update({ where: { id }, data: record });
    return { driveStatus: record.driveStatus, driveUrl: record.driveUrl };
  } catch (error) {
    const attempts = error instanceof DriveArchiveError ? error.attempts : 1;
    const record = driveRecord(row.driveAttempts, { ok: false, attempts });
    await getPrisma().generatedDocument.update({ where: { id }, data: record });
    return { driveStatus: record.driveStatus, driveUrl: record.driveUrl };
  }
}
