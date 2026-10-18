import { describe, expect, it, vi } from "vitest";
import { loadEnv, parseEnv } from "./env";

const secret = "secreto-de-sesion-con-al-menos-32";
const databaseUrl = "postgresql://eurobeo:eurobeo@localhost:5432/eurobeo";

describe("parseEnv", () => {
  it("falla e indica qué variable obligatoria falta", () => {
    expect(() => parseEnv({ SESSION_SECRET: secret })).toThrow(
      "Faltan variables de entorno obligatorias: DATABASE_URL",
    );
    expect(() => parseEnv({ DATABASE_URL: databaseUrl })).toThrow(
      "Faltan variables de entorno obligatorias: SESSION_SECRET",
    );
    expect(() => parseEnv({})).toThrow(
      "Faltan variables de entorno obligatorias: DATABASE_URL, SESSION_SECRET",
    );
  });

  it("acepta el arranque sin la clave de OpenAI", () => {
    const env = parseEnv({ DATABASE_URL: databaseUrl, SESSION_SECRET: secret });
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.PORT).toBe(3000);
  });

  it("rechaza un secreto de sesión demasiado corto", () => {
    expect(() => parseEnv({ DATABASE_URL: databaseUrl, SESSION_SECRET: "corto" })).toThrow(
      /SESSION_SECRET/,
    );
  });
});

describe("loadEnv", () => {
  it("avisa que la normalización con IA queda deshabilitada", () => {
    const warn = vi.fn();
    loadEnv({ DATABASE_URL: databaseUrl, SESSION_SECRET: secret }, { warn });
    expect(warn).toHaveBeenCalledWith(
      "OPENAI_API_KEY no está definida: la normalización con IA estará deshabilitada.",
    );
  });

  it("no avisa cuando la clave de OpenAI está presente", () => {
    const warn = vi.fn();
    loadEnv(
      { DATABASE_URL: databaseUrl, SESSION_SECRET: secret, OPENAI_API_KEY: "sk-test" },
      { warn },
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
