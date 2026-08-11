import { hash, verify } from "@node-rs/argon2";

// Argon2id (recommandation OWASP) via @node-rs/argon2, qui embarque des
// binaires natifs précompilés (napi-rs) — pas de toolchain de compilation
// nécessaire dans l'image Docker.
const ARGON2_OPTIONS = {
  memoryCost: 19456, // ~19 MiB, recommandation OWASP pour argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string,
): Promise<boolean> {
  return verify(passwordHash, plainPassword);
}
