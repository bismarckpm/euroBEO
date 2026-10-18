import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session";

const secret = "secreto-de-sesion-con-al-menos-32";

describe("sesión firmada", () => {
  it("acepta un token emitido con el secreto", async () => {
    const token = await createSessionToken("user-1", secret, 1_700_000_000_000);
    const session = await readSessionToken(token, secret, 1_700_000_000_000);
    expect(session?.sub).toBe("user-1");
  });

  it("rechaza un token alterado o vencido", async () => {
    const token = await createSessionToken("user-1", secret, 1_700_000_000_000);
    const [body, signature] = token.split(".");
    expect(await readSessionToken(`${body}.${signature?.slice(1)}x`, secret)).toBeNull();
    expect(await readSessionToken(token, secret, 1_900_000_000_000)).toBeNull();
  });
});
