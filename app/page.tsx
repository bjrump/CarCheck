import { Suspense } from "react";
import PrototypeDashboard from "@/app/components/PrototypeDashboard";
export default function Home() {
  return <Suspense fallback={<p className="p-8 text-sm">Vorschau wird geladen.</p>}><PrototypeDashboard /></Suspense>;
}
