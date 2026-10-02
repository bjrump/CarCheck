"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";

export type AppView = "garage" | "tasks" | "history";

export default function AppHeader({
  view,
  account,
  isPublic = false,
}: {
  view?: AppView;
  account?: React.ReactNode;
  isPublic?: boolean;
}) {
  const links = [
    { view: "garage", label: "Garage", href: "/" },
    { view: "tasks", label: "Aufgaben", href: "/?view=tasks" },
    { view: "history", label: "Historie", href: "/?view=history" },
  ] as const;
  return (
    <header className="topbar">
      <Link className="wordmark" href="/" aria-label="CarCheck Startseite">
        <span className="brand-mark">
          <Check size={18} strokeWidth={2.5} />
        </span>
        carcheck
      </Link>
      {!isPublic && (
        <nav className="topbar-nav" aria-label="Hauptnavigation">
          {links.map((link) => (
            <Link
              key={link.view}
              href={link.href}
              aria-current={view === link.view ? "page" : undefined}
              data-active={view === link.view}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {account}
      </div>
    </header>
  );
}
