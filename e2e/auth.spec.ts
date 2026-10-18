import { expect, test, type Page } from "@playwright/test";

const username = "asistente";
const password = "prueba-local-123";

async function login(page: Page, user = username, pass = password): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(user);
  await page.getByLabel("Contraseña").fill(pass);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("redirige a inicio de sesión cuando no hay sesión", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  const response = await request.get("/api/profile");
  expect(response.status()).toBe(401);
});

test("muestra un mensaje genérico si la contraseña es incorrecta", async ({ page }) => {
  await login(page, username, "clave-incorrecta");
  await expect(page).toHaveURL(/\/login\?error=credenciales/);
  await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos");
  await expect(page.getByText(/no existe|usuario inexistente/i)).toHaveCount(0);
});

test("inicia sesión con credenciales correctas", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Generador de B.E.O." })).toBeVisible();
  await expect(page.locator("main")).toContainText("Ana Pérez");
});

test("cierra la sesión y vuelve al inicio de sesión", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("actualiza el cargo que firma los memorándums", async ({ page }) => {
  await login(page);
  await page.goto("/perfil");
  await page.getByLabel("Cargo").fill("Coordinadora de Ventas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil actualizado.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Coordinadora de Ventas")).toBeVisible();
});
