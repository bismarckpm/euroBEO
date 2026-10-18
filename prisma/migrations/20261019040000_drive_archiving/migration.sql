-- Estado de archivo en Google Drive. Las credenciales no se guardan aquí.
ALTER TABLE "GeneratedDocument" ADD COLUMN "driveStatus" TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE "GeneratedDocument" ADD COLUMN "driveUrl" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN "driveAttempts" INTEGER NOT NULL DEFAULT 0;
