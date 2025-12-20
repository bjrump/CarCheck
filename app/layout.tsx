import type { Metadata } from "next";
import "./styles/globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import HeaderAddButton from "@/app/components/HeaderAddButton";

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
            <nav className="sticky top-0 z-30 border-b border-border/60 bg-card/70 backdrop-blur-xl">
              <div className="container mx-auto flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-bold shadow-soft">
                    CC
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
                    <h1 className="text-lg font-semibold">CarCheck</h1>
                  </div>
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
      </body>
    </html>
  );
}

