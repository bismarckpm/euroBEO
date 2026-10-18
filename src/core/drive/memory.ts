import type { DriveClient, DriveItem, DriveUpload } from "./client";

export type MemoryFolder = { id: string; name: string; parentId: string };

export type MemoryFile = DriveUpload & { id: string };

export type MemoryDrive = {
  client: DriveClient;
  folders: MemoryFolder[];
  files: MemoryFile[];
};

/** Drive en memoria para pruebas. No borra archivos. */
export function createMemoryDrive(): MemoryDrive {
  const folders: MemoryFolder[] = [];
  const files: MemoryFile[] = [];
  let sequence = 1;

  const client: DriveClient = {
    async findFolder(parentId, name) {
      const folder = folders.find((item) => item.parentId === parentId && item.name === name);
      return folder ? { id: folder.id, name: folder.name } : null;
    },
    async createFolder(parentId, name) {
      const folder = { id: `folder-${sequence}`, name, parentId };
      sequence += 1;
      folders.push(folder);
      return { id: folder.id, name: folder.name };
    },
    async listNames(folderId) {
      return [
        ...folders.filter((folder) => folder.parentId === folderId).map((folder) => folder.name),
        ...files.filter((file) => file.folderId === folderId).map((file) => file.name),
      ];
    },
    async upload(input) {
      const id = `file-${sequence}`;
      sequence += 1;
      files.push({ ...input, id });
      const item: DriveItem = {
        id,
        name: input.name,
        webViewLink: `https://drive.google.com/file/d/${id}/view`,
      };
      return item;
    },
  };

  return { client, folders, files };
}
