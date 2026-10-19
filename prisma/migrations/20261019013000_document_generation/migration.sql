-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "beoId" TEXT,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "docxPath" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "exceedsPage" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_type_version_key" ON "Template"("type", "version");

-- CreateIndex
CREATE INDEX "GeneratedDocument_eventId_idx" ON "GeneratedDocument"("eventId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_number_idx" ON "GeneratedDocument"("number");

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_beoId_fkey" FOREIGN KEY ("beoId") REFERENCES "Beo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
