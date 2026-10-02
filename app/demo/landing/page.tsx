import { notFound } from "next/navigation";
import LandingPage from "@/app/components/LandingPage";

export default function LandingPreview() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.CARCHECK_DEMO !== "1"
  )
    notFound();
  return <LandingPage isDemo />;
}
