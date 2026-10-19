-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalPdf" BYTEA NOT NULL,
    "status" TEXT NOT NULL,
    "justification" TEXT,
    "subtotalCents" INTEGER,
    "itemsSumCents" INTEGER NOT NULL,
    "differenceCents" INTEGER,
    "warnings" TEXT[],
    "structureErrors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetDay" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dates" TEXT[],
    "raw" TEXT NOT NULL,

    CONSTRAINT "BudgetDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetBlock" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "salonRaw" TEXT,
    "salonName" TEXT,
    "salonStatus" TEXT NOT NULL,
    "schedule" TEXT,
    "scheduleStatus" TEXT NOT NULL,
    "setup" TEXT,
    "setupStatus" TEXT NOT NULL,
    "pax" INTEGER,
    "paxStatus" TEXT NOT NULL,
    "nights" INTEGER,
    "rentRegular" INTEGER,
    "rentNet" INTEGER,
    "discountLabel" TEXT,
    "courtesy" BOOLEAN NOT NULL,
    "page" INTEGER NOT NULL,

    CONSTRAINT "BudgetBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sectionHeader" TEXT NOT NULL,
    "sectionTarget" TEXT,
    "sectionStatus" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "nights" INTEGER NOT NULL,
    "unitPriceCents" INTEGER,
    "totalCents" INTEGER,
    "flags" TEXT[],

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetBenefit" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "BudgetBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_locator_company_idx" ON "Event"("locator", "company");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_eventId_version_key" ON "Budget"("eventId", "version");

-- CreateIndex
CREATE INDEX "BudgetDay_budgetId_idx" ON "BudgetDay"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetBlock_dayId_idx" ON "BudgetBlock"("dayId");

-- CreateIndex
CREATE INDEX "BudgetItem_blockId_idx" ON "BudgetItem"("blockId");

-- CreateIndex
CREATE INDEX "BudgetBenefit_budgetId_idx" ON "BudgetBenefit"("budgetId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetDay" ADD CONSTRAINT "BudgetDay_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetBlock" ADD CONSTRAINT "BudgetBlock_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BudgetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "BudgetBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetBenefit" ADD CONSTRAINT "BudgetBenefit_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
