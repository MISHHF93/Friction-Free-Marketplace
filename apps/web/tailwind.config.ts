import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        brand: {
          ink: "hsl(var(--brand-ink))",
          slate: "hsl(var(--brand-slate))",
          mist: "hsl(var(--brand-mist))",
          cloud: "hsl(var(--brand-cloud))",
          surface: "hsl(var(--brand-surface))"
        },
        trust: {
          DEFAULT: "hsl(var(--trust))",
          foreground: "hsl(var(--trust-foreground))",
          soft: "hsl(var(--trust-soft))",
          border: "hsl(var(--trust-border))"
        },
        ai: {
          DEFAULT: "hsl(var(--ai))",
          foreground: "hsl(var(--ai-foreground))",
          soft: "hsl(var(--ai-soft))",
          border: "hsl(var(--ai-border))"
        },
        safety: {
          DEFAULT: "hsl(var(--safety))",
          foreground: "hsl(var(--safety-foreground))",
          soft: "hsl(var(--safety-soft))",
          warning: "hsl(var(--safety-warning))",
          risk: "hsl(var(--safety-risk))"
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
          soft: "hsl(var(--premium-soft))",
          graphite: "hsl(var(--premium-graphite))"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      },
      fontSize: {
        display: ["clamp(3rem,8vw,5.75rem)", { lineHeight: "0.92", letterSpacing: "-0.055em", fontWeight: "900" }],
        hero: ["clamp(2.5rem,6vw,4.5rem)", { lineHeight: "0.96", letterSpacing: "-0.045em", fontWeight: "900" }],
        section: ["clamp(2rem,4vw,3.25rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "900" }],
        eyebrow: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.22em", fontWeight: "900" }]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem"
      },
      borderRadius: {
        xs: "calc(var(--radius) - 10px)",
        sm: "calc(var(--radius) - 8px)",
        md: "calc(var(--radius) - 6px)",
        lg: "calc(var(--radius) - 2px)",
        xl: "var(--radius)",
        "2xl": "var(--radius-card)",
        "3xl": "var(--radius-panel)",
        "4xl": "var(--radius-hero)"
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)",
        trust: "var(--shadow-trust)",
        admin: "var(--shadow-admin)"
      },
      backgroundImage: {
        "brand-radial": "radial-gradient(circle at top left, hsl(var(--trust) / 0.18), transparent 34rem), radial-gradient(circle at 80% 0%, hsl(var(--ai) / 0.12), transparent 28rem), linear-gradient(180deg, hsl(var(--background)), hsl(var(--brand-cloud)))",
        "trust-gradient": "linear-gradient(135deg, hsl(var(--trust)), hsl(var(--ai)))",
        "premium-dark": "radial-gradient(circle at top right, hsl(var(--trust) / 0.32), transparent 32rem), linear-gradient(135deg, hsl(var(--premium-graphite)), hsl(var(--brand-ink)))"
      }
    }
  },
  plugins: [animate]
};

export default config;
