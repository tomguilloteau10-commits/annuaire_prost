import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listCategories, listCities, listLanguages, listServices } from "@/modules/taxonomies/taxonomy.service";
import { TaxonomyList } from "@/components/admin/TaxonomyList";
import { CityList } from "@/components/admin/CityList";

export default async function AdminTaxonomiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminTaxonomies");

  const [categories, services, languages, cities] = await Promise.all([
    listCategories({ includeInactive: true }),
    listServices({ includeInactive: true }),
    listLanguages({ includeInactive: true }),
    listCities({ includeInactive: true }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("categories")}</h2>
        <TaxonomyList
          kind="categories"
          identifierLabel={t("key")}
          locale={locale}
          items={categories.map((c) => ({ id: c.id, identifier: c.key, label: c.label, isActive: c.isActive }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("services")}</h2>
        <TaxonomyList
          kind="services"
          identifierLabel={t("key")}
          locale={locale}
          items={services.map((s) => ({ id: s.id, identifier: s.key, label: s.label, isActive: s.isActive }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("languages")}</h2>
        <TaxonomyList
          kind="languages"
          identifierLabel={t("code")}
          locale={locale}
          items={languages.map((l) => ({ id: l.id, identifier: l.code, label: l.label, isActive: l.isActive }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("cities")}</h2>
        <CityList items={cities.map((c) => ({ id: c.id, name: c.name, canton: c.canton, isActive: c.isActive }))} />
      </section>
    </main>
  );
}
