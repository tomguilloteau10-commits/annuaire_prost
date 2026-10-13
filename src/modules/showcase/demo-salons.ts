// Établissements fictifs de démonstration, statiques. Il n'existe pas
// encore de modèle "Salon" en base : un vrai salon devra passer par un
// parcours de vérification et de modération équivalent à celui des
// profils (ENGINEERING_RULES.md §2) avant toute publication. Les noms sont
// inventés ; les villes reprennent la liste des villes romandes du seed.

export type SalonType = "massage" | "studio" | "club" | "wellness";

export interface DemoSalon {
  slug: string;
  name: string;
  monogram: string;
  city: string;
  canton: string;
  type: SalonType;
  gradient: [string, string];
}

export const DEMO_SALONS: DemoSalon[] = [
  {
    slug: "velours-noir",
    name: "Salon Velours Noir",
    monogram: "V",
    city: "Genève",
    canton: "GE",
    type: "massage",
    gradient: ["#6b4560", "#1a1219"],
  },
  {
    slug: "maison-lumen",
    name: "Maison Lumen",
    monogram: "L",
    city: "Lausanne",
    canton: "VD",
    type: "wellness",
    gradient: ["#c9a3b3", "#4a3550"],
  },
  {
    slug: "studio-onyx",
    name: "Studio Onyx",
    monogram: "O",
    city: "Sion",
    canton: "VS",
    type: "studio",
    gradient: ["#3d5078", "#10141e"],
  },
  {
    slug: "atelier-nacre",
    name: "Atelier Nacre",
    monogram: "N",
    city: "Montreux",
    canton: "VD",
    type: "massage",
    gradient: ["#d9c2a5", "#6e4f3f"],
  },
  {
    slug: "cercle-opaline",
    name: "Le Cercle Opaline",
    monogram: "O",
    city: "Carouge",
    canton: "GE",
    type: "club",
    gradient: ["#6b938d", "#16201f"],
  },
];
