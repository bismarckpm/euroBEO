-- AlterTable
ALTER TABLE "Event" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'digital';

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'digital';
ALTER TABLE "Budget" ADD COLUMN "arithmetic" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Budget" ADD COLUMN "ocrReview" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Budget" ADD COLUMN "handwriting" JSONB NOT NULL DEFAULT '[]';
