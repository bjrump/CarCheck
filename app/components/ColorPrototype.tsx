"use client";
// Two accent palettes on the existing garage, switchable with ?variant=A|B.
import { useEffect, useState } from "react";

export default function ColorPrototype() {
  const [variant, setVariant] = useState("A");
  function switchVariant() {
    const url = new URL(window.location.href);
    const next = document.documentElement.dataset.palette === "B" ? "A" : "B";
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
    document.documentElement.dataset.palette = next;
    setVariant(next);
  }
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("variant") === "B" ? "B" : "A";
    document.documentElement.dataset.palette = initial;
    setVariant(initial);
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") switchVariant();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  if (process.env.NODE_ENV === "production") return null;
  return <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderRadius: 6, zIndex: 50, fontSize: 13 }}><button aria-label="Vorherige Farbe" onClick={switchVariant}>←</button><span>PROTOTYP · {variant === "A" ? "A: Blau" : "B: Petrol"}</span><button aria-label="Nächste Farbe" onClick={switchVariant}>→</button></div>;
}
