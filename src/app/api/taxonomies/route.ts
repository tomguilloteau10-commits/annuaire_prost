import { NextResponse } from "next/server";
import { listCategories, listCities, listLanguages, listServices } from "@/modules/taxonomies/taxonomy.service";

// Lecture publique des taxonomies actives — alimente à la fois les filtres
// de la liste publique et le formulaire d'édition de profil (choix de
// ville/catégorie/langues/services). Jamais de contenu en dur côté
// frontend : tout vient de cette route.
//
// Toujours dynamique : les taxonomies sont éditables depuis l'admin, donc
// jamais figées au build.
export const dynamic = "force-dynamic";

export async function GET() {
  const [categories, services, languages, cities] = await Promise.all([
    listCategories(),
    listServices(),
    listLanguages(),
    listCities(),
  ]);

  return NextResponse.json({ categories, services, languages, cities });
}
