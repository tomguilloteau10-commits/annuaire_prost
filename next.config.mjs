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
  },
};

export default withNextIntl(nextConfig);
