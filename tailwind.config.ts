import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Palette neutre volontairement sobre pour la bêta ; le design final
      // (branding, dark mode) viendra une fois les flux vérifiés.
      colors: {
        brand: {
          DEFAULT: "#1f2937",
          light: "#374151",
        },
      },
    },
  },
  plugins: [],
};

export default config;
