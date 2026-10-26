import { copyFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { getPrisma } from "../src/lib/db";

const source = path.join(process.cwd(), "fixtures", "golden", "scan-calox", "presupuesto-escaneado.pdf");
const pdf = path.join(tmpdir(), "presupuesto-escaneado.pdf");
copyFileSync(source, pdf);

async function openCount(page: Page): Promise<number> {
  return (await page.getByTestId("campo-abierto").count()) + (await page.getByTestId("linea-abierta").count());
}

async function postReview(page: Page, action: () => Promise<void>): Promise<void> {
  const saved = page.waitForResponse((response) => {
    if (response.request().method() !== "POST" || !response.url().endsWith("/review")) {
      return false;
    }
    return (response.request().postData() ?? "").includes("\"action\"");
  });
  await action();
  const response = await saved;
  if (!response.ok()) {
    throw new Error(
      `La revisión respondió ${response.status()} en ${response.url()} (${response.request().postData()?.slice(0, 160) ?? ""}).`,
    );
  }
}

async function clearSelected(page: Page) {
  for (let guard = 0; guard < 80; guard += 1) {
    const before = await openCount(page);
    if (before === 0) return;
    if ((await page.getByTestId("campo-abierto").count()) > 0) {
      const field = page.getByTestId("campo-abierto").first();
      const input = field.locator("input:not([type=checkbox]), textarea").first();
      if ((await input.count()) > 0 && (await input.inputValue()).trim() === "") {
        await input.fill("Confirmado");
        await postReview(page, () => input.press("Tab"));
      }
      if ((await openCount(page)) < before) {
        continue;
      }
      const current = page.getByTestId("campo-abierto").first();
      const validate = current.getByRole("button", { name: "Validar" });
      if ((await validate.count()) > 0) {
        await postReview(page, () => validate.click());
      } else {
        const typed = current.locator("input:not([type=checkbox]), textarea").first();
        if ((await typed.count()) > 0) {
          await postReview(page, () => typed.press("Tab"));
        }
      }
    } else {
      const price = page.getByTestId("linea-abierta").first().getByLabel("Precio unitario");
      if ((await price.inputValue()).trim() === "") {
        await price.fill("0,00");
      }
      await postReview(page, () => price.press("Tab"));
    }
    await expect.poll(() => openCount(page), { timeout: 15_000 }).toBeLessThan(before);
  }
  throw new Error("Quedaron campos por resolver.");
}

test("sube el escaneo de Calox, valida la cabecera y genera la B.E.O.", async ({ page }) => {
  test.setTimeout(420_000);
  const prisma = getPrisma();
  const existing = new Set((await prisma.generatedDocument.findMany({ select: { id: true } })).map((row) => row.id));
  try {
    await page.goto("/login");
    await page.getByLabel("Usuario").fill("asistente");
    await page.getByLabel("Contraseña").fill("prueba-local-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.goto("/presupuestos");
    await page.getByLabel("Presupuesto PDF").setInputFiles(pdf);
    await page.getByRole("button", { name: "Leer presupuesto" }).click();
    await expect(page.getByTestId("origen-escaneo")).toHaveText("Origen: escaneo", { timeout: 300_000 });
    const review = page.getByRole("link", { name: "Revisar evento" });
    const href = await review.getAttribute("href");
    if (!href) {
      throw new Error("La carga no ofreció la revisión.");
    }
    await page.goto(href);
    await expect(page.getByRole("heading", { name: "Revisión" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Lectura del escaneo" })).toBeVisible();

    const executive = page.getByLabel("Ejecutiva");
    await executive.fill("Jeannette García");
    const savedExecutive = page.waitForResponse(
      (response) => response.url().includes("/review") && response.request().method() === "POST",
    );
    await executive.press("Tab");
    await savedExecutive;
    await expect(page.getByLabel("Ejecutiva")).toHaveValue("Jeannette García");

    const salon = page.getByLabel("Salón").first();
    if ((await salon.count()) > 0 && (await salon.inputValue()).trim() === "") {
      await salon.fill("Stand Calox");
      await salon.press("Tab");
    }

    const nav = page.getByTestId("beo-nav");
    const total = await nav.count();
    for (let index = 0; index < total; index += 1) {
      await nav.nth(index).click();
      await clearSelected(page);
    }
    await clearSelected(page);
    await expect(page.getByTestId("pendientes-evento")).toHaveText("Sin pendientes", { timeout: 30_000 });
    await page.getByTestId("confirmar-generar").click();
    await expect(page.getByTestId("generacion")).toContainText("Se inició la generación", { timeout: 120_000 });
    await expect(page.getByTestId("descargas")).toContainText("B.E.O.");
  } finally {
    const created = await prisma.generatedDocument.findMany();
    for (const row of created) {
      if (existing.has(row.id)) continue;
      await rm(row.docxPath, { force: true });
      await rm(row.pdfPath, { force: true });
    }
  }
});
