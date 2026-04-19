import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import type { PluginAPI } from "tailwindcss/types/config";

function shadcnTailwind3Compat({ addVariant }: PluginAPI) {
  addVariant(
    "data-open",
    '&:where([data-state="open"],[data-open]:not([data-open="false"]))'
  );
  addVariant(
    "data-closed",
    '&:where([data-state="closed"],[data-closed]:not([data-closed="false"]))'
  );
  addVariant("data-starting-style", "&[data-starting-style]");
  addVariant("data-ending-style", "&[data-ending-style]");
  addVariant("data-inset", "&[data-inset]");
  addVariant("data-popup-open", "&[data-popup-open]");
}

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          border: "var(--accent-border)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate, shadcnTailwind3Compat],
};
export default config;
