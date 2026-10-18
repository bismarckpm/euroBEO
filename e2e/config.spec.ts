import { expect, test } from "@playwright/test";

const username = "asistente";
const password = "prueba-local-123";

test("un alias nuevo lo usa la resolución de salón", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const official = `Salón Prueba ${stamp}`;
  const alias = `Salon Temporal ${stamp}`;

  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: "Generador de B.E.O." })).toBeVisible();

  await page.goto("/configuracion");
  await page.getByLabel("Nombre oficial").fill(official);
  await page.getByRole("button", { name: "Agregar salón" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.getByLabel("Salón del alias").selectOption({ label: official });
  await page.getByLabel("Alias", { exact: true }).fill(alias);
  await page.getByRole("button", { name: "Agregar alias" }).click();
  await expect(page.getByText(alias)).toBeVisible();

  await page.getByLabel("Probar un texto").fill(alias);
  await page.getByRole("button", { name: "Probar" }).click();
  await expect(page.getByTestId("resolucion")).toHaveText(`Resuelto: ${official}`);
});
