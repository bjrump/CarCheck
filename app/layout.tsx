import type { Metadata } from "next";
import "./styles/globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import ConvexClientProvider from "@/app/components/providers/ConvexClientProvider";
import { ToastProvider } from "@/app/components/ToastProvider";
import { ConfirmDialogProvider } from "@/app/components/ConfirmDialog";
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
            <ToastProvider>
              <ConfirmDialogProvider>
                <div className="min-h-screen flex flex-col">
                <nav className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                  <div className="container mx-auto flex items-center justify-between px-4 py-3 md:py-4">
                    <a href="/" className="flex items-center gap-3 group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-indigo-600 text-accent-foreground font-bold shadow-lg shadow-accent/25 transition-transform group-hover:scale-105">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                          <circle cx="7" cy="17" r="2" />
                          <circle cx="17" cy="17" r="2" />
                        </svg>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Fahrzeugverwaltung</p>
                        <h1 className="text-lg font-bold gradient-text">CarCheck</h1>
                      </div>
                    </a>
                    
                    <div className="flex items-center gap-2 md:gap-3">
                      <ThemeToggle />
                      <SignedOut>
                        <SignInButton mode="modal">
                          <button className="btn btn-primary text-sm">
                            Anmelden
                          </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <button className="btn btn-outline text-sm hidden sm:inline-flex">
                            Registrieren
                          </button>
                        </SignUpButton>
                      </SignedOut>
                      <SignedIn>
                        <UserButton
                          appearance={{
                            elements: {
                              avatarBox: "h-9 w-9 ring-2 ring-accent/20 ring-offset-2 ring-offset-background",
                            },
                          }}
                        />
                      </SignedIn>
                    </div>
                  </div>
                </nav>
                
                <main className="flex-1 flex flex-col">
                    <div className="container mx-auto px-4 py-6 md:py-8">
                      {children}
                    </div>
                </main>
              </div>
              </ConfirmDialogProvider>
            </ToastProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
