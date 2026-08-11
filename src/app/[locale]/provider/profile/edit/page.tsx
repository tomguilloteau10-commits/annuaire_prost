import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { getProviderDashboardData, getOwnContact } from "@/modules/profiles/profile.service";
import { listCategories, listCities, listLanguages, listServices } from "@/modules/taxonomies/taxonomy.service";
import { getProviderEntitlements, getPlanFeatures } from "@/modules/entitlements/entitlements.service";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/provider/ProfileEditForm";
import { ContactForm } from "@/components/provider/ContactForm";
import { PhotoManager } from "@/components/provider/PhotoManager";

export default async function ProfileEditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);
  const t = await getTranslations("profileEdit");

  const [{ profile }, contact, categories, services, languages, cities] = await Promise.all([
    getProviderDashboardData(user.id),
    getOwnContact(user.id),
    listCategories(),
    listServices(),
    listLanguages(),
    listCities(),
  ]);

  const entitlements = profile
    ? await getProviderEntitlements(profile.id)
    : await getPlanFeatures((await prisma.plan.findUniqueOrThrow({ where: { code: "founder" } })).id);

  const initialValues = profile
    ? {
        displayName: profile.displayName,
        description: profile.description,
        citySlug: profile.city.slug,
        categoryKey: profile.category.key,
        languageCodes: profile.languages.map((l) => l.language.code),
        serviceKeys: profile.services.map((s) => s.service.key),
        onlineStatus: profile.onlineStatus,
      }
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <ProfileEditForm
        locale={locale}
        categories={categories}
        services={services}
        languages={languages}
        cities={cities}
        initialValues={initialValues}
      />

      {profile && (
        <>
          <ContactForm initialPhone={contact?.phone ?? ""} initialEmail={contact?.email ?? ""} />
          <PhotoManager
            initialPhotos={profile.media.map((m) => ({
              id: m.id,
              status: m.status,
              rejectionReason: m.rejectionReason,
            }))}
            maxPhotos={entitlements.maxPhotos}
          />
        </>
      )}
      {!profile && <p className="text-sm text-gray-500">{t("saveProfileFirstForPhotos")}</p>}
    </main>
  );
}
