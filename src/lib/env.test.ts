import { describe, expect, it, vi } from "vitest";
import { driveSettings, loadEnv, parseEnv } from "./env";

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
    expect(warn).toHaveBeenCalledWith(
      "Drive no está configurado: los documentos quedarán pendientes de subir.",
    );
  });

  it("no avisa cuando la clave de OpenAI y Drive están presentes", () => {
    const warn = vi.fn();
    loadEnv(
      {
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: secret,
        OPENAI_API_KEY: "sk-test",
        GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "archivo@hotel.test" }),
        DRIVE_ROOT_FOLDER_ID: "carpeta-raiz",
      },
      { warn },
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Drive", () => {
  it("arranca sin credenciales y deja el PDF apagado", () => {
    const env = parseEnv({ DATABASE_URL: databaseUrl, SESSION_SECRET: secret });
    expect(env.DRIVE_UPLOAD_PDF).toBe(false);
    expect(env.GOOGLE_SERVICE_ACCOUNT_JSON).toBeUndefined();
    expect(driveSettings(env).configured).toBe(false);
  });

  it("acepta la carpeta raíz por el nombre nuevo o por el alias anterior", () => {
    const base = { DATABASE_URL: databaseUrl, SESSION_SECRET: secret };
    expect(parseEnv({ ...base, DRIVE_ROOT_FOLDER_ID: "nueva" }).DRIVE_ROOT_FOLDER_ID).toBe("nueva");
    expect(parseEnv({ ...base, GOOGLE_DRIVE_FOLDER_ID: "anterior" }).DRIVE_ROOT_FOLDER_ID).toBe(
      "anterior",
    );
  });

  it("rechaza un JSON de cuenta de servicio que no es un objeto", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: secret,
        GOOGLE_SERVICE_ACCOUNT_JSON: "[]",
      }),
    ).toThrow(/GOOGLE_SERVICE_ACCOUNT_JSON/);
  });

  it("exige las tres credenciales OAuth juntas", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: secret,
        GOOGLE_OAUTH_CLIENT_ID: "cliente",
      }),
    ).toThrow(/GOOGLE_OAUTH_CLIENT_SECRET/);
  });

  it("acepta true en DRIVE_UPLOAD_PDF y rechaza un valor desconocido", () => {
    const env = parseEnv({
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: secret,
      DRIVE_UPLOAD_PDF: "true",
    });
    expect(env.DRIVE_UPLOAD_PDF).toBe(true);
    expect(() =>
      parseEnv({ DATABASE_URL: databaseUrl, SESSION_SECRET: secret, DRIVE_UPLOAD_PDF: "quizas" }),
    ).toThrow(/DRIVE_UPLOAD_PDF/);
  });
});
