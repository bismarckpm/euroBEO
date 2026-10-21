import { copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

const username = "asistente";
const password = "prueba-local-123";

test("subir Federación China muestra el resumen sin diferencias", async ({ page }) => {
  test.setTimeout(120_000);
  const source = path.join(
    process.cwd(),
    "fixtures",
    "presupuestos",
    "Presupuesto Federación China - 07.10.2026 - Evento Interno.pdf",
  );
  // Chromium deja el input vacío si la ruta del archivo trae tildes.
  const pdf = path.join(tmpdir(), "presupuesto-china.pdf");
  copyFileSync(source, pdf);

  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Generador de B.E.O." })).toBeVisible();

  await page.goto("/presupuestos");
  await page.getByLabel("Presupuesto PDF").setInputFiles(pdf);
  await page.getByRole("button", { name: "Leer presupuesto" }).click();

  const summary = page.getByTestId("resumen");
  const newVersion = page.getByRole("button", { name: "Guardar como nueva versión" });
  await expect(summary.or(newVersion)).toBeVisible({ timeout: 60_000 });
  if (await newVersion.isVisible()) {
    await newVersion.click();
  }
  await expect(summary).toContainText("FEDERACIÓN CHINA", { timeout: 60_000 });
  await expect(summary).toContainText("CENA DE GALA");
  await expect(summary).toContainText("Sin diferencias");
  await expect(page.getByText("Página 1, tabla:")).toHaveCount(0);
});
