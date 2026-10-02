import { Suspense } from "react";
import LiveWorkspace from "@/app/components/LiveWorkspace";

export default async function Home() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.CARCHECK_DEMO === "1"
  ) {
    const [{ getDemoCars }, { default: DemoWorkspace }] = await Promise.all([
      import("@/app/demo/actions"),
      import("@/app/components/DemoWorkspace"),
    ]);
    return (
      <Suspense fallback={<p className="p-8 text-sm">Garage wird geladen.</p>}>
        <DemoWorkspace initialCars={await getDemoCars()} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<p className="p-8 text-sm">Garage wird geladen.</p>}>
      <LiveWorkspace />
    </Suspense>
  );
}
