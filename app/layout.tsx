import type { Metadata } from "next";
import "./styles/globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import HeaderAddButton from "@/app/components/HeaderAddButton";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CarCheck - Fahrzeugverwaltung",
  description: "Verwalten Sie Ihre Fahrzeuge, TÜV-Termine, Ölwechsel und Reifen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>
          <div className="min-h-screen">
            <nav className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-sm">
              <div className="container mx-auto flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <a
                    href="/"
                    className="flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-muted/60"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background font-bold shadow-[0_10px_28px_rgba(0,0,0,0.18)] ring-4 ring-offset-2 ring-offset-background ring-foreground/10">
                      CC
                    </div>
                    <div className="leading-tight">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        Fahrzeugakte
                      </p>
                      <h1 className="text-xl font-semibold">CarCheck</h1>
                    </div>
                  </a>
                  <span className="hidden md:inline text-xs text-muted-foreground border-l border-border/80 pl-3">
                    Klare Werkstatt-Optik ohne KI-Gedöns
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <HeaderAddButton />
                  <ThemeToggle />
                </div>
              </div>
            </nav>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
