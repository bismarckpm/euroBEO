import { expect, test } from "@playwright/test";

const username = "asistente";
const password = "prueba-local-123";

test("corregir un salón se aprende y el siguiente proceso no llama a la IA", async ({ page }) => {
  const source = `SALON PLAZA CARACAS ${Date.now().toString(36)}`;

  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Generador de B.E.O." })).toBeVisible();

  await page.goto("/configuracion?tab=aprendidas");
  await page.getByLabel("Texto original").fill(source);
  await page.getByLabel("Salón aprendido").selectOption({ label: "Diamante" });
  await page.getByRole("button", { name: "Guardar normalización" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await expect(page.getByText(source, { exact: true })).toBeVisible();

  await page.getByLabel("Texto a procesar").fill(source);
  await page.getByRole("button", { name: "Procesar texto" }).click();
  const outcome = page.getByTestId("normalizacion");
  await expect(outcome).toContainText("Diamante");
  await expect(outcome).toContainText("Regla");
  await expect(outcome).toContainText("Sin llamada a la IA");

  const row = page.locator("form").filter({ hasText: source });
  await row.getByLabel(`Resultado de ${source}`).selectOption({ label: "Topacio" });
  await row.getByRole("button", { name: "Guardar cambio" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.getByLabel("Texto a procesar").fill(source);
  await page.getByRole("button", { name: "Procesar texto" }).click();
  await expect(page.getByTestId("normalizacion")).toContainText("Topacio");
  await expect(page.getByTestId("normalizacion")).toContainText("Regla");
  await expect(page.getByTestId("normalizacion")).toContainText("Sin llamada a la IA");

  await page
    .locator("form")
    .filter({ hasText: source })
    .getByRole("button", { name: "Desactivar" })
    .click();
  await page.getByLabel("Texto a procesar").fill(source);
  await page.getByRole("button", { name: "Procesar texto" }).click();
  await expect(page.getByTestId("normalizacion")).toContainText(source.replace(/^SALON\s+/i, ""));
  await expect(page.getByTestId("normalizacion")).toContainText("Regla");
  await expect(page.getByTestId("normalizacion")).toContainText("Sin llamada a la IA");
});
