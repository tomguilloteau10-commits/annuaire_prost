-- Vérification d'identité MANUELLE par l'admin (ENGINEERING_RULES.md §1-§2) :
-- dépôt chiffré et temporaire des pièces (VerificationDocument, supprimé à la
-- décision), motif de refus, statut du permis de travail facultatif.
-- Écrite à la main : `prisma migrate diff` proposerait aussi de supprimer
-- City.geo (PostGIS, hors schéma).

-- CreateEnum
CREATE TYPE "WorkPermitStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationDocumentKind" AS ENUM ('IDENTITY_FRONT', 'IDENTITY_BACK', 'WORK_PERMIT');

-- AlterTable
ALTER TABLE "OnboardingAttestation" ADD COLUMN     "workPermitRejectionReason" TEXT,
ADD COLUMN     "workPermitReviewedAt" TIMESTAMP(3),
ADD COLUMN     "workPermitStatus" "WorkPermitStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "VerificationRecord" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "kind" "VerificationDocumentKind" NOT NULL,
    "contentType" TEXT NOT NULL,
    "encryptedContent" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationDocument_providerId_kind_idx" ON "VerificationDocument"("providerId", "kind");

-- CreateIndex
CREATE INDEX "VerificationDocument_purgeAt_idx" ON "VerificationDocument"("purgeAt");

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

