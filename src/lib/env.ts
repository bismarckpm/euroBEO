import { z } from "zod";

const REQUIRED_ENV_VARS = ["DATABASE_URL", "SESSION_SECRET"] as const;

const optionalText = z.string().trim().min(1).optional();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL debe ser una URL de PostgreSQL",
    ),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  OPENAI_API_KEY: optionalText,
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4.1-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(20_000),
  GOOGLE_SERVICE_ACCOUNT_JSON: optionalText.refine((value) => {
    if (value === undefined) {
      return true;
    }
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "GOOGLE_SERVICE_ACCOUNT_JSON debe ser un JSON de cuenta de servicio"),
  GOOGLE_DRIVE_FOLDER_ID: optionalText,
  PORT: z.coerce.number().int().positive().default(3000),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvSource = Record<string, string | undefined>;

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function issueMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

/** Valida el entorno y nombra las variables obligatorias que faltan. */
export function parseEnv(source: EnvSource): AppEnv {
  const missing = REQUIRED_ENV_VARS.filter((key) => !source[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(", ")}`);
  }

  const parsed = envSchema.safeParse({
    DATABASE_URL: source.DATABASE_URL,
    SESSION_SECRET: source.SESSION_SECRET,
    OPENAI_API_KEY: blankToUndefined(source.OPENAI_API_KEY),
    OPENAI_MODEL: blankToUndefined(source.OPENAI_MODEL) ?? "gpt-4.1-mini",
    OPENAI_TIMEOUT_MS: blankToUndefined(source.OPENAI_TIMEOUT_MS) ?? "20000",
    GOOGLE_SERVICE_ACCOUNT_JSON: blankToUndefined(source.GOOGLE_SERVICE_ACCOUNT_JSON),
    GOOGLE_DRIVE_FOLDER_ID: blankToUndefined(source.GOOGLE_DRIVE_FOLDER_ID),
    PORT: blankToUndefined(source.PORT),
  });

  if (!parsed.success) {
    throw new Error(`Configuración de entorno inválida: ${issueMessage(parsed.error)}`);
  }

  return parsed.data;
}

/** Carga el entorno al arrancar. Sin clave de OpenAI, la IA queda deshabilitada. */
export function loadEnv(
  source: EnvSource = process.env,
  logger: Pick<Console, "warn"> = console,
): AppEnv {
  const env = parseEnv(source);
  if (!env.OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY no está definida: la normalización con IA estará deshabilitada.");
  }
  return env;
}
