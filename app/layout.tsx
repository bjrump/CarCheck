import type { Metadata } from "next";
import "./styles/globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import HeaderAddButton from "@/app/components/HeaderAddButton";
import ConvexClientProvider from "@/app/components/providers/ConvexClientProvider";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "CarCheck - Fahrzeugverwaltung",
  description: "Verwalten Sie Ihre Fahrzeuge, TÜV-Termine, Inspektionen und Reifen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ConvexClientProvider>
          <ThemeProvider>
            <div className="min-h-screen">
              <nav className="sticky top-0 z-30 border-b border-border/60 bg-card/70 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-bold shadow-soft">
                        CC
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
                        <h1 className="text-lg font-semibold">CarCheck</h1>
                      </div>
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <SignedIn>
                      <HeaderAddButton />
                    </SignedIn>
                    <ThemeToggle />
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg">
                          Anmelden
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted">
                          Registrieren
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "h-9 w-9",
                          },
                        }}
                      />
                    </SignedIn>
                  </div>
                </div>
              </nav>
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
