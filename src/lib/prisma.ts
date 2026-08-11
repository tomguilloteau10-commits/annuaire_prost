import { PrismaClient } from "@prisma/client";

// Singleton en dev pour éviter d'épuiser les connexions Postgres à chaque
// rechargement à chaud de Next.js.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Le niveau "query" n'est jamais activé, même en dev : Prisma y
    // inclurait les valeurs des paramètres, ce qui logguerait en clair des
    // champs comme ProfileContact.phone/email (contrainte #5).
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
