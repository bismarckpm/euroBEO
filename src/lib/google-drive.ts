import { Readable } from "node:stream";
import type { JWTInput } from "google-auth-library";
import { google, type drive_v3 } from "googleapis";
import type { DriveClient, DriveItem, DriveUpload } from "../core/drive/client";

const SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const JWT_KEYS = [
  "type",
  "client_email",
  "private_key",
  "private_key_id",
  "project_id",
  "client_id",
  "client_secret",
  "refresh_token",
  "quota_project_id",
  "universe_domain",
] as const satisfies readonly (keyof JWTInput)[];

export type GoogleDriveAuth = {
  serviceAccountJson?: string;
  oauth?: { clientId: string; clientSecret: string; refreshToken: string };
};

function quoted(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function serviceAccountCredentials(json: string): JWTInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("La cuenta de servicio de Drive no es válida.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("La cuenta de servicio de Drive no es válida.");
  }
  const source = parsed as Record<string, unknown>;
  if (typeof source.client_email !== "string" || typeof source.private_key !== "string") {
    throw new Error("La cuenta de servicio de Drive no incluye client_email y private_key.");
  }
  const credentials: JWTInput = {};
  for (const key of JWT_KEYS) {
    const value = source[key];
    if (typeof value === "string") {
      credentials[key] = value;
    }
  }
  return credentials;
}

function authorize(auth: GoogleDriveAuth) {
  if (auth.serviceAccountJson) {
    return new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials(auth.serviceAccountJson),
      scopes: [SCOPE],
    });
  }
  if (!auth.oauth) {
    throw new Error("Drive no está configurado.");
  }
  const oauth = new google.auth.OAuth2(auth.oauth.clientId, auth.oauth.clientSecret);
  oauth.setCredentials({ refresh_token: auth.oauth.refreshToken });
  return oauth;
}

/** Cliente real de Drive. Sube el archivo con su tipo original, sin convertirlo a Google Docs. */
export function createGoogleDriveClient(auth: GoogleDriveAuth): DriveClient {
  const drive = google.drive({ version: "v3", auth: authorize(auth) });
  return {
    findFolder: (parentId, name) => findFolder(drive, parentId, name),
    createFolder: (parentId, name) => createFolder(drive, parentId, name),
    listNames: (folderId) => listNames(drive, folderId),
    upload: (input) => uploadFile(drive, input),
  };
}

async function findFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<DriveItem | null> {
  const listed = await drive.files.list({
    q: `name = ${quoted(name)} and mimeType = ${quoted(FOLDER_MIME)} and ${quoted(parentId)} in parents and trashed = false`,
    fields: "files(id,name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const folder = listed.data.files?.[0];
  if (!folder?.id || !folder.name) {
    return null;
  }
  return { id: folder.id, name: folder.name };
}

async function createFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<DriveItem> {
  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id,name",
    supportsAllDrives: true,
  });
  if (!created.data.id || !created.data.name) {
    throw new Error("Drive no devolvió la carpeta.");
  }
  return { id: created.data.id, name: created.data.name };
}

async function listNames(drive: drive_v3.Drive, folderId: string): Promise<string[]> {
  const names: string[] = [];
  let pageToken: string | undefined;
  do {
    const listed = await drive.files.list({
      q: `${quoted(folderId)} in parents and trashed = false`,
      fields: "nextPageToken, files(name)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const file of listed.data.files ?? []) {
      if (file.name) {
        names.push(file.name);
      }
    }
    pageToken = listed.data.nextPageToken ?? undefined;
  } while (pageToken);
  return names;
}

async function uploadFile(drive: drive_v3.Drive, input: DriveUpload): Promise<DriveItem> {
  const created = await drive.files.create({
    requestBody: {
      name: input.name,
      mimeType: input.mimeType,
      parents: [input.folderId],
    },
    media: { mimeType: input.mimeType, body: Readable.from(input.body) },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });
  if (!created.data.id || !created.data.name) {
    throw new Error("Drive no devolvió el archivo.");
  }
  return {
    id: created.data.id,
    name: created.data.name,
    webViewLink: created.data.webViewLink,
  };
}
