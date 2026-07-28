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
          steel: "hsl(var(--brand-steel))",
          mist: "hsl(var(--brand-mist))",
          cloud: "hsl(var(--brand-cloud))",
          pearl: "hsl(var(--brand-pearl))",
          surface: "hsl(var(--brand-surface))"
        },
        surface: {
          canvas: "hsl(var(--surface-canvas))",
          elevated: "hsl(var(--surface-elevated))",
          sunken: "hsl(var(--surface-sunken))",
          overlay: "hsl(var(--surface-overlay))",
          inverse: "hsl(var(--surface-inverse))"
        },
        commerce: {
          DEFAULT: "hsl(var(--commerce))",
          foreground: "hsl(var(--commerce-foreground))",
          soft: "hsl(var(--commerce-soft))",
          border: "hsl(var(--commerce-border))",
          dark: "hsl(var(--commerce-dark))"
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
          border: "hsl(var(--safety-border))",
          warning: "hsl(var(--safety-warning))",
          "warning-soft": "hsl(var(--safety-warning-soft))",
          "warning-border": "hsl(var(--safety-warning-border))",
          risk: "hsl(var(--safety-risk))",
          "risk-soft": "hsl(var(--safety-risk-soft))",
          "risk-border": "hsl(var(--safety-risk-border))"
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
          soft: "hsl(var(--premium-soft))",
          border: "hsl(var(--premium-border))",
          graphite: "hsl(var(--premium-graphite))"
        },
        data: {
          1: "hsl(var(--data-1))",
          2: "hsl(var(--data-2))",
          3: "hsl(var(--data-3))",
          4: "hsl(var(--data-4))",
          5: "hsl(var(--data-5))"
        }
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Cascadia Code", "Consolas", "Liberation Mono", "monospace"]
      },
      fontSize: {
        display: ["clamp(3rem,8vw,5.75rem)", { lineHeight: "0.92", letterSpacing: "-0.055em", fontWeight: "900" }],
        hero: ["clamp(2.5rem,6vw,4.5rem)", { lineHeight: "0.96", letterSpacing: "-0.045em", fontWeight: "900" }],
        section: ["clamp(2rem,4vw,3.25rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "900" }],
        title: ["1.5rem", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "850" }],
        body: ["1rem", { lineHeight: "1.7", letterSpacing: "-0.011em" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6", letterSpacing: "-0.006em" }],
        label: ["0.8125rem", { lineHeight: "1.15", letterSpacing: "-0.006em", fontWeight: "750" }],
        meta: ["0.75rem", { lineHeight: "1.35", letterSpacing: "0.01em", fontWeight: "650" }],
        eyebrow: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.22em", fontWeight: "900" }],
        metric: ["2rem", { lineHeight: "1", letterSpacing: "-0.045em", fontWeight: "900" }]
      },
      spacing: {
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        gutter: "clamp(1rem, 2.4vw, 2rem)",
        "section-sm": "clamp(2.5rem, 5vw, 4rem)",
        section: "clamp(3rem, 7vw, 6rem)",
        "section-lg": "clamp(4rem, 9vw, 8rem)",
        touch: "2.75rem"
      },
      borderRadius: {
        xs: "calc(var(--radius) - 10px)",
        sm: "calc(var(--radius) - 8px)",
        md: "calc(var(--radius) - 6px)",
        lg: "calc(var(--radius) - 2px)",
        xl: "var(--radius)",
        "2xl": "var(--radius-card)",
        "3xl": "var(--radius-panel)",
        "4xl": "var(--radius-hero)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        shell: "var(--radius-shell)"
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        input: "var(--shadow-input)",
        control: "var(--shadow-control)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        panel: "var(--shadow-panel)",
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)",
        trust: "var(--shadow-trust)",
        ai: "var(--shadow-ai)",
        commerce: "var(--shadow-commerce)",
        danger: "var(--shadow-danger)",
        admin: "var(--shadow-admin)"
      },
      ringWidth: {
        3: "3px"
      },
      keyframes: {
        "soft-enter": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "soft-enter": "soft-enter 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: [animate]
};

export default config;
