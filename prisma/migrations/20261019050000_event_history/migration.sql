-- Historial: versión de la B.E.O., snapshot por documento e índices de búsqueda.
ALTER TABLE "Beo" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GeneratedDocument" ADD COLUMN "snapshot" JSONB;

CREATE INDEX "Event_company_idx" ON "Event"("company");
CREATE INDEX "Event_title_idx" ON "Event"("title");
CREATE INDEX "Event_locator_idx" ON "Event"("locator");
CREATE INDEX "Beo_date_idx" ON "Beo"("date");
CREATE INDEX "BudgetDay_dates_idx" ON "BudgetDay" USING GIN ("dates");
