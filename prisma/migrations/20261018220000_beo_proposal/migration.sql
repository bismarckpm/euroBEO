-- CreateTable
CREATE TABLE "Beo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "salon" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeoField" (
    "id" TEXT NOT NULL,
    "beoId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "BeoField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeoLine" (
    "id" TEXT NOT NULL,
    "beoId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unitPriceCents" INTEGER,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "BeoLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beo_eventId_idx" ON "Beo"("eventId");

-- CreateIndex
CREATE INDEX "BeoField_beoId_idx" ON "BeoField"("beoId");

-- CreateIndex
CREATE INDEX "BeoLine_beoId_idx" ON "BeoLine"("beoId");

-- AddForeignKey
ALTER TABLE "Beo" ADD CONSTRAINT "Beo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeoField" ADD CONSTRAINT "BeoField_beoId_fkey" FOREIGN KEY ("beoId") REFERENCES "Beo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeoLine" ADD CONSTRAINT "BeoLine_beoId_fkey" FOREIGN KEY ("beoId") REFERENCES "Beo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
