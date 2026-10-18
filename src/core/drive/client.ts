export type DriveItem = {
  id: string;
  name: string;
  webViewLink?: string | null;
};

export type DriveUpload = {
  folderId: string;
  name: string;
  mimeType: string;
  body: Buffer;
};

/** Operaciones de Drive que usa el archivo. Las credenciales viven fuera de esta interfaz. */
export interface DriveClient {
  findFolder(parentId: string, name: string): Promise<DriveItem | null>;
  createFolder(parentId: string, name: string): Promise<DriveItem>;
  listNames(folderId: string): Promise<string[]>;
  upload(input: DriveUpload): Promise<DriveItem>;
}
