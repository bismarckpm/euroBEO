import { rm } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import { expect, type Page, test } from "@playwright/test";
import { getPrisma } from "../src/lib/db";

const username = "asistente";
const password = "prueba-local-123";
const pdf = path.join(
  process.cwd(),
  "fixtures",
  "presupuestos",
  "Presupuesto Gran Encuentro Nena 2026 - 20 al 23.10.2026 - EVENTO 3.pdf",
);

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

test("genera el memo de Nena con los salones de sus B.E.O.", async ({ page }) => {
  test.setTimeout(300_000);
  const prisma = getPrisma();
  const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
  const existing = new Set((await prisma.generatedDocument.findMany({ select: { id: true } })).map((row) => row.id));
  const signer = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  try {
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
    await expect(page.getByTestId("memo-nav")).toContainText("Tarifa de estacionamiento");

    await page.getByLabel("Cartelera del evento").fill("GRAN ENCUENTRO NENA");
    await page.getByRole("button", { name: "Confirmar datos del evento" }).click();
    await expect(page.getByTestId("generacion")).toContainText("replicados");

    const nav = page.getByTestId("beo-nav");
    const total = await nav.count();
    const salons: string[] = [];
    for (let index = 0; index < total; index += 1) {
      await nav.nth(index).click();
      const label = ((await nav.nth(index).innerText()) ?? "").replace(/\s+/g, " ");
      const salon = /·\s*(.*?)\s*(Montaje|Evento|Desmontaje)/.exec(label)?.[1]?.trim();
      if (salon) salons.push(salon);
      await clearSelected(page);
    }

    await page.getByTestId("memo-nav").click();
    const number = page.getByLabel("Número del memorándum");
    if ((await number.inputValue()).trim() === "") {
      await number.fill("89");
      await number.press("Tab");
    }
    await clearSelected(page);
    await expect(page.getByTestId("pendientes-evento")).toHaveText("Sin pendientes", { timeout: 20_000 });
    await page.getByTestId("confirmar-generar").click();
    await expect(page.getByTestId("generacion")).toContainText("Se inició la generación", { timeout: 180_000 });
    const memoLink = page.getByRole("link", { name: /^89 / });
    await expect(memoLink).toBeVisible();
    const href = await memoLink.getAttribute("href");
    const downloaded = await page.request.get(href ?? "");
    expect(downloaded.ok()).toBeTruthy();
    const xml = new PizZip(await downloaded.body()).file("word/document.xml")?.asText() ?? "";
    const text = xml.replace(/<[^>]+>/g, " ");
    expect(salons.filter((salon) => text.includes(salon)).length).toBeGreaterThan(0);
    if (signer?.name) {
      expect(text).toContain(signer.name);
    }
    if (signer?.title) {
      expect(text).toContain(signer.title);
    }
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
    await prisma.$disconnect();
  }
});
