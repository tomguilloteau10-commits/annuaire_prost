import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les photos ne sont jamais servies par next/image via une URL publique
  // directe : elles passent par l'endpoint de signature (voir
  // src/modules/media). Aucun domaine externe n'a donc besoin d'être
  // autorisé ici pour la bêta.
  images: {
    remotePatterns: [],
  },
  // @node-rs/argon2 embarque un binaire natif (.node) : il doit être
  // chargé via require() côté serveur, pas bundlé par webpack.
  // Anciennes adresses de l'espace prestataire (avant /dashboard) : gardées
  // en redirection pour les favoris et liens déjà envoyés.
  // En-têtes de sécurité des réponses d'API (les pages les reçoivent du
  // middleware, qui ne s'applique pas à /api). Aucune réponse d'API ne doit
  // être interprétée autrement que son type déclaré, ni affichée dans un
  // cadre, ni transmettre son adresse à un site tiers.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/:locale/provider/dashboard", destination: "/:locale/dashboard", permanent: false },
      { source: "/:locale/provider/profile/edit", destination: "/:locale/dashboard/profile", permanent: false },
      { source: "/:locale/provider/onboarding", destination: "/:locale/dashboard/onboarding", permanent: false },
      { source: "/:locale/provider/verification", destination: "/:locale/dashboard/verification", permanent: false },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2"],
    // Pas de cache côté navigateur pour les pages dynamiques : après une
    // décision de l'admin (photo validée, identité vérifiée), la page
    // suivante montre toujours l'état réel, jamais une copie périmée
    // (bug des photos restées "en attente").
    staleTimes: { dynamic: 0 },
    // src/instrumentation.ts : purge périodique des données expirées.
    instrumentationHook: true,
  },
};

export default withNextIntl(nextConfig);
