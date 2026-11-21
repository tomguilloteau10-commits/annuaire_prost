import type { Config } from "tailwindcss";

// Direction : « velours de nuit » — luxe feutré, dark mode uniquement (un
// seul thème, volontairement). Fond noir prune profond éclairé de halos
// discrets, accent principal or champagne (actions, premium), rose poudré
// en second (repères, liens), ivoire chaud pour le texte. Les verts restent
// réservés aux signaux de confiance (en ligne, vérifiée), l'ambre aux
// alertes — jamais confondus avec l'or de l'accent. Palette tirée du logo.
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0C0A0E",
          soft: "#110E13",
        },
        surface: {
          DEFAULT: "#16121A",
          raised: "#1E1824",
          hover: "#282030",
        },
        hairline: "rgba(236,226,214,0.08)",
        hairline2: "rgba(236,226,214,0.15)",
        ink2: {
          DEFAULT: "#F2ECE4",
          muted: "#AEA4AC",
          faint: "#776D7C",
        },
        accent: {
          DEFAULT: "#D9B77E",
          hover: "#E8CB97",
          deep: "#B08D55",
          foreground: "#1B1208",
          soft: "rgba(217,183,126,0.12)",
        },
        rose: {
          DEFAULT: "#E2A3BC",
          deep: "#C77896",
          soft: "rgba(226,163,188,0.12)",
        },
        success: {
          DEFAULT: "#6FCF97",
          soft: "rgba(111,207,151,0.13)",
        },
        warning: {
          DEFAULT: "#EE9A5E",
          soft: "rgba(238,154,94,0.14)",
        },
        danger: {
          DEFAULT: "#E59393",
          soft: "rgba(229,147,147,0.14)",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(242,236,228,0.05) inset, 0 18px 40px -24px rgba(0,0,0,0.85)",
        pop: "0 24px 60px -20px rgba(0,0,0,0.8)",
        glow: "0 0 0 1px rgba(217,183,126,0.35), 0 18px 50px -18px rgba(217,183,126,0.35)",
        "gold-btn": "0 1px 0 0 rgba(255,255,255,0.35) inset, 0 10px 24px -10px rgba(217,183,126,0.55)",
      },
      backgroundImage: {
        "gold-sheen": "linear-gradient(135deg, #F0D9A8 0%, #D9B77E 45%, #B48A4E 100%)",
        "card-scrim":
          "linear-gradient(180deg, rgba(12,10,14,0.25) 0%, rgba(12,10,14,0) 18%, rgba(12,10,14,0) 45%, rgba(12,10,14,0.3) 62%, rgba(12,10,14,0.72) 80%, rgba(12,10,14,0.94) 100%)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
