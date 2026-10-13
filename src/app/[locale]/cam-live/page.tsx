import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";

// Emplacement réservé : aucune brique de streaming n'est configurée ici.
export default async function CamLivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("camLive");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-8 px-4 py-14 text-center sm:py-20">
      <div
        className="relative flex aspect-[16/9] w-full max-w-xl items-center justify-center overflow-hidden rounded-xl3 border border-hairline"
        style={{ background: "radial-gradient(120% 120% at 30% 20%, #4a3550 0%, #1c1622 45%, #0E1116 100%)" }}
        aria-hidden
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink/60 px-3.5 py-1.5 text-xs font-medium tracking-[0.2em] text-ink2-muted backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          LIVE
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Badge variant="accent">{t("badge")}</Badge>
        <h1 className="font-serif text-4xl font-medium text-ink2 sm:text-5xl">{t("title")}</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink2-muted">{t("description")}</p>
      </div>

      <Link
        href="/"
        className="rounded-full border border-hairline2 bg-surface-raised px-5 py-2.5 text-sm font-medium text-ink2 transition-colors hover:bg-surface-hover"
      >
        {t("back")}
      </Link>
    </main>
  );
}
