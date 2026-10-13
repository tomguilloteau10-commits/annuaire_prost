-- Formulaire prestataire multi-étapes : âge auto-déclaré (contenu
-- éditorial, voir le commentaire au-dessus de ProviderProfile.age dans
-- schema.prisma — distinct de la vérification d'identité, contrainte #1)
-- et deux nouveaux canaux de contact (WhatsApp/Instagram), protégés par la
-- même séparation structurelle que phone/email (ENGINEERING_RULES.md §5).

ALTER TABLE "ProviderProfile" ADD COLUMN "age" INTEGER;

ALTER TABLE "ProfileContact" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "ProfileContact" ADD COLUMN "instagram" TEXT;
