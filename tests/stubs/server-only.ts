// Stub pour les tests : le vrai package "server-only" jette une erreur si
// résolu hors du runtime serveur de Next.js (condition d'export
// "react-server"). Vitest tourne en Node nu, sans cette condition — on
// alias donc ce module vers un no-op (voir vitest.config.ts) pour pouvoir
// tester du code qui importe légitimement "server-only".
export {};
