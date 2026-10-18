import { z } from "zod";
import { recordAudit } from "./audit";
import { getPrisma } from "./db";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
});

export class ProfileValidationError extends Error {
  constructor(message = "El nombre y el cargo son obligatorios.") {
    super(message);
    this.name = "ProfileValidationError";
  }
}

export type SignerProfile = {
  name: string;
  title: string;
};

/** Datos que los memorándums usan como firma. */
export function signatureFromProfile(profile: SignerProfile): SignerProfile {
  return { name: profile.name, title: profile.title };
}

export function parseProfileInput(input: { name: string; title: string }): SignerProfile {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProfileValidationError();
  }
  return signatureFromProfile(parsed.data);
}

export async function updateSignerProfile(
  userId: string,
  input: { name: string; title: string },
): Promise<SignerProfile> {
  const next = parseProfileInput(input);
  const prisma = getPrisma();
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    throw new ProfileValidationError("No se encontró la usuaria.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: next.name, title: next.title },
  });

  await recordAudit({
    action: "profile.update",
    entity: "User",
    entityId: userId,
    before: { name: current.name, title: current.title },
    after: { name: updated.name, title: updated.title },
  });

  return signatureFromProfile(updated);
}
