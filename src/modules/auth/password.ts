import { randomBytes } from "node:crypto";
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

let dummyHash: Promise<string> | undefined;

/**
 * Hash d'un mot de passe aléatoire, calculé une fois : la connexion à un
 * compte inexistant vérifie contre lui, pour prendre autant de temps qu'un
 * vrai compte (sinon la durée de réponse révélerait qui est inscrit).
 */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  return dummyHash;
}
