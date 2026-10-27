import { copyFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import PizZip from "pizzip";
import { expect, type Page, test } from "@playwright/test";
import { getPrisma } from "../src/lib/db";

const username = "asistente";
const password = "prueba-local-123";
const source = path.join(
  process.cwd(),
  "fixtures",
  "presupuestos",
  "Presupuesto Congreso de Reumatología 22 al 24.10.2026 - Evento 3.pdf",
);
// Chromium deja el input vacío si la ruta del archivo trae tildes.
const pdf = path.join(tmpdir(), "presupuesto-reumatologia.pdf");
copyFileSync(source, pdf);

async function openReview(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.goto("/eventos");
  await page.getByRole("link", { name: "Crear evento" }).click();
  await expect(page.getByRole("heading", { name: "Crear evento" })).toBeVisible();
  await page.getByLabel("Presupuesto PDF").setInputFiles(pdf);
  await page.getByRole("button", { name: "Leer presupuesto" }).click();
  const reviewLink = page.getByRole("link", { name: "Revisar evento" });
  const newVersion = page.getByRole("button", { name: "Guardar como nueva versión" });
  await expect(reviewLink.or(newVersion)).toBeVisible({ timeout: 60_000 });
  if (await newVersion.isVisible()) {
    const saved = page.waitForResponse(
      (response) => response.url().includes("/api/budgets") && response.request().method() === "POST",
    );
    await newVersion.click();
    await saved;
  }
  await reviewLink.click();
  await expect(page.getByRole("heading", { name: "Datos del evento" }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Alimentos y bebidas" })).toHaveCount(0);
  await expect(page.getByTestId("generar-beo")).toHaveCount(0);
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
  await page.getByTestId("beo-siguiente").click();
  await expect(page).toHaveURL(/\/asistente\/beo\//);
  await expect(page.getByTestId("generar-beo")).toHaveCount(0);
  await expect(page.locator('[data-testid="beo-nav"][aria-current="page"]')).toContainText("Revisar");
  const eventId = new URL(page.url()).pathname.split("/")[2] ?? "";
  const field = await getPrisma().beoField.findFirst({ where: { beo: { eventId } } });
  if (!field) {
    throw new Error("La revisión no tiene campos.");
  }
  await getPrisma().beoField.update({ where: { id: field.id }, data: { status: "PENDING" } });
  await page.getByTestId("paso-generar").click();
  await expect(page).toHaveURL(/\/asistente\/generar/);
  await page.reload();
  await expect(page.getByTestId("generar-beo")).toBeDisabled();
  await expect(page.getByTestId("generar-memo")).toBeDisabled();
  await expect(page.getByTestId("generar-ambos")).toBeDisabled();
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

  await page.locator('[data-testid="beo-nav"]').filter({ hasText: "Evento" }).first().click();
  const price = page.getByLabel("Precio unitario").first();
  await price.fill("36,00");
  await price.press("Tab");
  await expect(page.getByText("USD 36,00 c/u").first()).toBeVisible();

  const nav = page.getByTestId("beo-nav");
  const total = await nav.count();
  for (let index = 0; index < total; index += 1) {
    await nav.nth(index).click();
    await expect(nav.nth(index)).toHaveAttribute("aria-current", "page");
    await clearSelected(page);
  }
  await expect(page.getByTestId("pendientes-evento")).toHaveText("Sin pendientes");
  await page.getByTestId("paso-generar").click();
  await expect(page).toHaveURL(/\/asistente\/generar/);
  await expect(page.getByTestId("generar-ambos")).toBeEnabled();
  await page.getByTestId("generar-ambos").click();
  await expect(page.getByTestId("generacion")).toContainText("Se inició la generación", { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Alimentos y bebidas" })).toHaveCount(0);
  await expect(page.getByTestId("tabla-archivos")).toBeVisible();
  await expect(page.getByTestId("descargas")).toContainText("Descargar todo");
  await expect(page.getByTestId("descargas")).toContainText("B.E.O.");
  const archivos = page.getByTestId("fila-archivo");
  await expect(archivos.first()).toBeVisible();
  await expect(archivos).toHaveCount(
    await page.getByTestId("descargas").locator("a[href*='format=docx']").count(),
  );
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

test("guarda el precio editado si se genera sin esperar el tabulador", async ({ page }) => {
  test.setTimeout(300_000);
  const prisma = getPrisma();
  const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
  const existing = new Set((await prisma.generatedDocument.findMany({ select: { id: true } })).map((row) => row.id));
  try {
    await openReview(page);
    const eventId = new URL(page.url()).pathname.split("/")[2] ?? "";
    await page.getByLabel("Cartelera del evento").fill("CONGRESO NACIONAL DE REUMATOLOGÍA");
    await page.getByRole("button", { name: "Confirmar datos del evento" }).click();
    await expect(page.getByTestId("generacion")).toContainText("replicados");

    const nav = page.getByTestId("beo-nav");
    const total = await nav.count();
    for (let index = 0; index < total; index += 1) {
      await nav.nth(index).click();
      await expect(nav.nth(index)).toHaveAttribute("aria-current", "page");
      await clearSelected(page);
    }
    await expect(page.getByTestId("pendientes-evento")).toHaveText("Sin pendientes");
    const evento = nav.filter({ hasText: "Evento" }).first();
    await evento.click();
    await expect(evento).toHaveAttribute("aria-current", "page");
    const price = page.getByLabel("Precio unitario").first();
    await price.fill("41,00");
    const savedPrice = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || !response.url().includes("/review")) {
        return false;
      }
      return (response.request().postData() ?? "").includes("41,00");
    });
    await page.getByTestId("paso-generar").click();
    await savedPrice;
    await expect.poll(
      () => prisma.beoLine.count({ where: { unitPriceCents: 4100, beo: { eventId } } }),
      { timeout: 10_000 },
    ).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/asistente\/generar/);
    await page.getByTestId("generar-ambos").click();
    await expect(page.getByTestId("generacion")).toContainText("Se inició la generación", { timeout: 120_000 });
    await expect(page.getByTestId("descargas").locator("a[href*='format=docx']").first()).toBeVisible();

    const saved = await prisma.beoLine.count({
      where: { unitPriceCents: 4100, beo: { eventId } },
    });
    expect(saved).toBeGreaterThan(0);
    const links = page.getByTestId("descargas").locator("a[href*='format=docx']");
    const count = await links.count();
    let printed = false;
    const seen: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      const downloaded = await page.request.get(href ?? "");
      expect(downloaded.ok()).toBeTruthy();
      const plain = (new PizZip(await downloaded.body()).file("word/document.xml")?.asText() ?? "").replace(
        /<[^>]+>/g,
        "",
      );
      if (plain.includes("41,00")) printed = true;
      seen.push(...(plain.match(/\d[\d.]*,\d{2}/g) ?? []).slice(0, 8));
    }
    expect(printed, seen.join(" | ")).toBe(true);
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

test("agregar línea abre una ventana y no guarda al cerrarla ni sin descripción", async ({ page }) => {
  test.setTimeout(120_000);
  await openReview(page);
  await page.getByTestId("beo-nav").first().click();
  await page.getByRole("button", { name: "Agregar línea" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Agua con gas")).toHaveCount(0);

  await page.getByRole("button", { name: "Agregar línea" }).first().click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Agregar" }).click();
  await expect(dialog.getByText("La línea necesita cantidad y descripción.")).toBeVisible();
  await dialog.getByLabel("Descripción nueva ALIMENTOS").fill("Agua con gas");
  await dialog.getByLabel("Precio nuevo ALIMENTOS").fill("3,00");
  await dialog.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Agua con gas").first()).toBeVisible({ timeout: 10_000 });
});
