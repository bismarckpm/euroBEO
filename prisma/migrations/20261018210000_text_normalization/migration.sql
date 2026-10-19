-- CreateTable
CREATE TABLE "LearnedNormalization" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnedNormalization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "fragment" TEXT NOT NULL,
    "response" JSONB,
    "valid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnedNormalization_task_normalizedText_key" ON "LearnedNormalization"("task", "normalizedText");

-- CreateIndex
CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");
