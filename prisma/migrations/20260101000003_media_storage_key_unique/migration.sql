-- storageKey doit être unique : /api/media/serve le résout via
-- findUnique() pour retrouver le statut de modération avant de servir un
-- fichier (ENGINEERING_RULES.md §6).

CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");
