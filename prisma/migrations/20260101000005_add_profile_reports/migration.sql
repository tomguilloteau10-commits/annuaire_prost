-- Signalements de profils par les visiteurs (ENGINEERING_RULES.md §7) :
-- file traitée par un humain, aucune donnée sur l'auteur du signalement.
-- Écrite à la main (comme les autres) : `prisma migrate diff` proposerait
-- aussi de supprimer City.geo, colonne PostGIS volontairement hors schéma.

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('UNDERAGE', 'COERCION', 'FAKE_PROFILE', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "ProfileReport" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileReport_status_createdAt_idx" ON "ProfileReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileReport" ADD CONSTRAINT "ProfileReport_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
