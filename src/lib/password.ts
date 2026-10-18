import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD = "not-a-real-password";

let dummyHash: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHash ??= hash(DUMMY_PASSWORD, BCRYPT_ROUNDS);
  return dummyHash;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

/**
 * Compara en tiempo aproximadamente constante. Si no hay usuario, igual ejecuta
 * bcrypt contra un hash ficticio para no revelar si el usuario existe.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string | null,
): Promise<boolean> {
  const hashToCompare = passwordHash ?? (await getDummyHash());
  const matches = await compare(password, hashToCompare);
  return passwordHash !== null && matches;
}
