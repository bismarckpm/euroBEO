import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { getPrisma } from "../src/lib/db";

const username = "asistente";
const password = "prueba-local-123";
const pdf = path.join(
  process.cwd(),
  "fixtures",
  "presupuestos",
  "Presupuesto Congreso de Reumatología 22 al 24.10.2026 - Evento 3.pdf",
);

async function openReview(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.goto("/presupuestos");
  await page.getByLabel("Presupuesto PDF").setInputFiles(pdf);
  await page.getByRole("button", { name: "Leer presupuesto" }).click();
  const reviewLink = page.getByRole("link", { name: "Revisar evento" });
  const newVersion = page.getByRole("button", { name: "Guardar como nueva versión" });
  await expect(reviewLink.or(newVersion)).toBeVisible({ timeout: 60_000 });
  if (await newVersion.isVisible()) {
    await newVersion.click();
  }
  await reviewLink.click();
  await expect(page.getByRole("heading", { name: "Revisión" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("beo-nav")).toHaveCount(6);
}

async function openCount(page: Page): Promise<number> {
  return (await page.getByTestId("campo-abierto").count()) + (await page.getByTestId("linea-abierta").count());
}

async function clearSelected(page: Page) {
  for (let guard = 0; guard < 80; guard += 1) {
    const before = await openCount(page);
    if (before === 0) return;
    const field = page.getByTestId("campo-abierto").first();
    if ((await page.getByTestId("campo-abierto").count()) > 0) {
      const validate = field.getByRole("button", { name: "Validar" });
      if ((await validate.count()) > 0) {
        await validate.click();
      } else {
        const input = field.locator("input:not([type=checkbox]), textarea").first();
        if ((await input.inputValue()).trim() === "") {
          await input.fill("Confirmado");
        }
        await input.press("Tab");
      }
    } else {
      const price = page.getByTestId("linea-abierta").first().getByLabel("Precio unitario");
      if ((await price.inputValue()).trim() === "") {
        await price.fill("0,00");
      }
      await price.press("Tab");
    }
    await expect.poll(() => openCount(page), { timeout: 10_000 }).toBeLessThan(before);
  }
  throw new Error("Quedaron campos por resolver.");
}

test("el botón sigue deshabilitado mientras hay pendientes", async ({ page }) => {
  test.setTimeout(120_000);
  await openReview(page);
  await expect(page.getByTestId("confirmar-generar")).toBeDisabled();
  await expect(page.getByTestId("pendientes-evento")).toContainText("Faltan");
});

test("valida, confirma la cartelera, ajusta un precio y llega a cero pendientes", async ({ page }) => {
  test.setTimeout(300_000);
  const prisma = getPrisma();
  const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
  const existing = new Set((await prisma.generatedDocument.findMany({ select: { id: true } })).map((row) => row.id));
  try {
  await openReview(page);
  await page.getByLabel("Cartelera del evento").fill("CONGRESO NACIONAL DE REUMATOLOGÍA");
  await page.getByRole("button", { name: "Confirmar datos del evento" }).click();
  await expect(page.getByTestId("generacion")).toContainText("replicados");

  const price = page.getByLabel("Precio unitario").first();
  await price.fill("36,00");
  await price.press("Tab");
  await expect(page.getByText("USD 36,00 c/u").first()).toBeVisible();

  const nav = page.getByTestId("beo-nav");
  const total = await nav.count();
  for (let index = 0; index < total; index += 1) {
    await nav.nth(index).click();
    await clearSelected(page);
  }
  await expect(page.getByTestId("pendientes-evento")).toHaveText("Sin pendientes");
  await expect(page.getByTestId("confirmar-generar")).toBeEnabled();
  await page.getByTestId("confirmar-generar").click();
  await expect(page.getByTestId("generacion")).toContainText("Se inició la generación", { timeout: 120_000 });
  await expect(page.getByTestId("descargas")).toContainText("Descargar todo");
  await expect(page.getByTestId("descargas")).toContainText("B.E.O.");
  } finally {
    const created = await prisma.generatedDocument.findMany();
    for (const row of created) {
      if (existing.has(row.id)) continue;
      await rm(row.docxPath, { force: true });
      await rm(row.pdfPath, { force: true });
      await prisma.generatedDocument.delete({ where: { id: row.id } });
    }
    if (before) {
      await prisma.sequence.update({
        where: { key: "beo" },
        data: { lastNumber: before.lastNumber, year: before.year },
      });
    }
  }
});
