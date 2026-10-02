import type { Metadata } from "next";
import "./styles/globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";
import { ToastProvider } from "@/app/components/ToastProvider";
import { ConfirmDialogProvider } from "@/app/components/ConfirmDialog";
import ConvexClientProvider from "@/app/components/providers/ConvexClientProvider";

export const metadata: Metadata = {
  title: "CarCheck | Dein Auto. Alles im Blick.",
  description:
    "TÜV, Inspektion, Reifen und Tankkosten. Deine Fahrzeuge, Termine und Historie an einem Ort.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDemo =
    process.env.NODE_ENV === "development" && process.env.CARCHECK_DEMO === "1";
  const content = (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </ThemeProvider>
  );
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased">
        {isDemo ? (
          content
        ) : (
          <ConvexClientProvider>{content}</ConvexClientProvider>
        )}
      </body>
    </html>
  );
}
