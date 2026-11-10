/**
 * Démarrage du serveur Next.js : lance la purge périodique des données à
 * durée de vie limitée (voir instrumentation-node.ts). Le test sur
 * NEXT_RUNTIME, écrit tel quel, permet à Next de retirer ce code du moteur
 * « Edge », qui n'a pas accès au disque ni à la base.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
