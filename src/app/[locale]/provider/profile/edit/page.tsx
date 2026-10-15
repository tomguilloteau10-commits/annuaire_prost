import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { getProviderDashboardData, getOwnContact } from "@/modules/profiles/profile.service";
import { listCategories, listCities, listLanguages, listServices } from "@/modules/taxonomies/taxonomy.service";
import { getProviderEntitlements, getPlanFeatures } from "@/modules/entitlements/entitlements.service";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ProfileWizard } from "@/components/provider/ProfileWizard";

export default async function ProfileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { locale } = await params;
  const { step } = await searchParams;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);
  const t = await getTranslations("profileEdit");

  const [{ profile }, contact, categories, services, languages, cities] =
    await Promise.all([
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
        age: profile.age,
        description: profile.description,
        citySlug: profile.city.slug,
        categoryKey: profile.category.key,
        languageCodes: profile.languages.map((l) => l.language.code),
        serviceKeys: profile.services.map((s) => s.service.key),
        details: {
          heightCm: profile.heightCm,
          bodyType: profile.bodyType,
          hairColor: profile.hairColor,
          eyeColor: profile.eyeColor,
          rate30Min: profile.rate30Min,
          rate1Hour: profile.rate1Hour,
          rate2Hours: profile.rate2Hours,
          rateNight: profile.rateNight,
          availableDays: profile.availableDays,
          availableFrom: profile.availableFrom,
          availableTo: profile.availableTo,
          receives: profile.receives,
          travels: profile.travels,
        },
      }
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <Link href="/provider/dashboard" className="self-start text-sm text-ink2-muted transition-colors hover:text-ink2">
          ← {t("backToDashboard")}
        </Link>
        <h1 className="font-serif text-3xl font-medium text-ink2">{profile ? t("title") : t("createTitle")}</h1>
      </div>

      <ProfileWizard
        locale={locale}
        categories={categories}
        services={services}
        languages={languages}
        cities={cities}
        initialValues={initialValues}
        initialContact={{
          phone: contact?.phone ?? "",
          email: contact?.email ?? "",
          whatsapp: contact?.whatsapp ?? "",
          instagram: contact?.instagram ?? "",
        }}
        initialPhotos={
          profile?.media.map((m) => ({
            id: m.id,
            status: m.status,
            rejectionReason: m.rejectionReason,
          })) ?? []
        }
        maxPhotos={entitlements.maxPhotos}
        initialStep={step}
      />
    </main>
  );
}
