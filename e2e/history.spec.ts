import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { formatBeoNumber } from "../src/core/config/sequence";
import { getPrisma } from "../src/lib/db";

const username = "asistente";
const password = "prueba-local-123";

test("anular una B.E.O. no vuelve a proponer su número", async ({ page }) => {
  test.setTimeout(120_000);
  const prisma = getPrisma();
  const sequence = await prisma.sequence.findUnique({ where: { key: "beo" } });
  const template = await prisma.template.findFirst({ where: { type: "beo" } });
  if (!sequence || !template) {
    test.skip();
    return;
  }
  const voidedNumber = formatBeoNumber(sequence.lastNumber + 1, sequence.year);
  const event = await prisma.event.create({
    data: {
      title: `Anulación ${randomUUID()}`,
      company: `Cliente ${randomUUID()}`,
      locator: randomUUID(),
      beos: {
        create: {
          position: 0,
          status: "generated",
          date: "2026-10-23",
          salon: "Diamante",
          kind: "EVENTO",
          fields: {
            create: { key: "schedule", value: "08:00 a 18:00", status: "RULE", source: "test" },
          },
        },
      },
    },
    include: { beos: true },
  });
  const beo = event.beos[0];
  if (!beo) {
    throw new Error("No se creó la B.E.O.");
  }
  await prisma.generatedDocument.create({
    data: {
      eventId: event.id,
      beoId: beo.id,
      kind: "beo",
      version: 1,
      number: voidedNumber,
      fileName: "B.E.O. anulada.docx",
      docxPath: "missing.docx",
      pdfPath: "missing.pdf",
      sha256: "abc",
      templateId: template.id,
    },
  });

  try {
    await page.goto("/login");
    await page.getByLabel("Usuario").fill(username);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.goto(`/eventos/${event.id}/revision`);
    await expect(page.getByRole("heading", { name: "Generar" })).toBeVisible();
    await expect(page.getByTestId("siguiente-numero")).not.toContainText(voidedNumber);
    await page.getByTestId("anular-beo").click();
    await expect(page.getByTestId("beo-nav")).toContainText("Anulada");
    await expect(page.getByTestId("siguiente-numero")).not.toContainText(voidedNumber);
  } finally {
    await prisma.event.delete({ where: { id: event.id } });
  }
});
