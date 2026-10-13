import type { Config } from "tailwindcss";

// Direction : SaaS premium sobre, dark mode uniquement (pas de bascule
// clair/sombre — le site n'a qu'un seul thème, volontairement). Fond
// anthracite profond, un seul accent (mauve/rose discret), verts
// réservés aux signaux de confiance (en ligne, vérifiée).
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1116",
          soft: "#12151B",
        },
        surface: {
          DEFAULT: "#15181F",
          raised: "#1C212B",
          hover: "#232936",
        },
        hairline: "rgba(237,235,230,0.08)",
        hairline2: "rgba(237,235,230,0.14)",
        ink2: {
          DEFAULT: "#EDEBE6",
          muted: "#9A9CA8",
          faint: "#6A6E7A",
        },
        accent: {
          DEFAULT: "#C9A3B3",
          hover: "#D6B6C4",
          foreground: "#1A1319",
          soft: "rgba(201,163,179,0.12)",
        },
        success: {
          DEFAULT: "#5EC88A",
          soft: "rgba(94,200,138,0.14)",
        },
        warning: {
          DEFAULT: "#E0B463",
          soft: "rgba(224,180,99,0.14)",
        },
        danger: {
          DEFAULT: "#DD8C8C",
          soft: "rgba(221,140,140,0.14)",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(237,235,230,0.04), 0 8px 24px -12px rgba(0,0,0,0.5)",
        pop: "0 12px 32px -8px rgba(0,0,0,0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
