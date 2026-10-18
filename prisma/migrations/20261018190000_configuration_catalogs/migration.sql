-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonAlias" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionMapping" (
    "id" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedText" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedText_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MemoType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keywords" TEXT[],
    "templateFile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "key" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salon_name_key" ON "Salon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAlias_normalized_key" ON "SalonAlias"("normalized");

-- CreateIndex
CREATE INDEX "SalonAlias_salonId_idx" ON "SalonAlias"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionMapping_normalized_key" ON "SectionMapping"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_normalized_key" ON "CatalogItem"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "MemoType_name_key" ON "MemoType"("name");

-- AddForeignKey
ALTER TABLE "SalonAlias" ADD CONSTRAINT "SalonAlias_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
