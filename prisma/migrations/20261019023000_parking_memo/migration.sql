-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "triggers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MemoType" ADD COLUMN "excludeSetupDays" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memoTypeId" TEXT NOT NULL,
    "number" TEXT,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoField" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "MemoField_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN "memoId" TEXT;

-- CreateIndex
CREATE INDEX "Memo_eventId_idx" ON "Memo"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Memo_eventId_memoTypeId_key" ON "Memo"("eventId", "memoTypeId");

-- CreateIndex
CREATE INDEX "MemoField_memoId_idx" ON "MemoField"("memoId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoField_memoId_key_key" ON "MemoField"("memoId", "key");

-- CreateIndex
CREATE INDEX "GeneratedDocument_memoId_idx" ON "GeneratedDocument"("memoId");

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_memoTypeId_fkey" FOREIGN KEY ("memoTypeId") REFERENCES "MemoType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoField" ADD CONSTRAINT "MemoField_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
