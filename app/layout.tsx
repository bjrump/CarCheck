// Throwaway design preview: no live auth or backend.
import type { Metadata } from "next";
import "./styles/globals.css";
export const metadata: Metadata = { title: "CarCheck v2 · Designvorschau" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de" className="dark" suppressHydrationWarning><body>{children}</body></html>;
}
