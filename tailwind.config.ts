import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Ignore missing files during build
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        success: "var(--success)",
        "success-foreground": "var(--success-foreground)",
        warning: "var(--warning)",
        "warning-foreground": "var(--warning-foreground)",
        danger: "var(--danger)",
        "danger-foreground": "var(--danger-foreground)",
        info: "var(--info)",
        "info-foreground": "var(--info-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)",
      },
      backgroundImage: {
        "grid-light":
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)",
        "grid-dark":
          "radial-gradient(circle at 1px 1px, rgba(226,232,240,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;

