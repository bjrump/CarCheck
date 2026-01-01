import { Car } from "@/app/lib/types";
import {
  calculateNextTireChangeDate,
  formatDate,
  formatNumber,
  getMaintenanceStatus,
  getStatusColorClass,
  getStatusText,
} from "@/app/lib/utils";

interface CarCardProps {
  car: Car;
  onSelect: (car: Car) => void;
}

export default function CarCard({ car, onSelect }: CarCardProps) {
  const tuvStatus = getMaintenanceStatus(car.tuv.nextAppointmentDate);
  const inspectionStatus = getMaintenanceStatus(
    car.inspection.nextInspectionDate
  );

  // Get current tire and next tire change
  const currentTire = car.currentTireId
    ? car.tires?.find((t) => t.id === car.currentTireId)
    : null;
  const nextTireChange = calculateNextTireChangeDate(currentTire?.type || null);
  const tireStatus = nextTireChange
    ? getMaintenanceStatus(nextTireChange.date)
    : "none";

  const getTireTypeLabel = (
    type: "summer" | "winter" | "all-season" | null
  ): string => {
    if (!type) return "Keine";
    switch (type) {
      case "summer":
        return "Sommer";
      case "winter":
        return "Winter";
      case "all-season":
        return "Ganzjahr";
      default:
        return type;
    }
  };

  const content = (
    <>
      <div className="flex justify-between items-start gap-4 mb-5 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Baujahr {car.year}
          </span>
          <h2 className="text-2xl font-semibold text-foreground">
            {car.make} {car.model}
          </h2>
          {car.licensePlate && (
            <p className="text-sm text-muted-foreground">
              Kennzeichen: {car.licensePlate}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
          {formatNumber(car.mileage)} km
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {/* TÜV */}
        <div className="rounded-xl border border-border/60 bg-muted/60 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-semibold text-muted-foreground w-20">
                TÜV
              </h3>
              <span className="text-sm text-foreground">
                {formatDate(car.tuv.nextAppointmentDate)}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold border ${getStatusColorClass(
                tuvStatus
              )}`}
            >
              {getStatusText(tuvStatus)}
            </span>
          </div>
        </div>

        {/* Inspektion */}
        <div className="rounded-xl border border-border/60 bg-muted/60 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-semibold text-muted-foreground w-20">
                Inspektion
              </h3>
              <span className="text-sm text-foreground">
                {formatDate(car.inspection.nextInspectionDate)}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold border ${getStatusColorClass(
                inspectionStatus
              )}`}
            >
              {getStatusText(inspectionStatus)}
            </span>
          </div>
        </div>

        {/* Reifen */}
        <div className="rounded-xl border border-border/60 bg-muted/60 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-semibold text-muted-foreground w-20">
                Reifen
              </h3>
              <span className="text-sm text-foreground">
                {currentTire ? getTireTypeLabel(currentTire.type) : "Keine"}
                {currentTire?.type !== "all-season" && nextTireChange && (
                  <span className="text-muted-foreground ml-2">
                    • Wechsel: {formatDate(nextTireChange.date)}
                  </span>
                )}
              </span>
            </div>
            {currentTire?.type !== "all-season" && nextTireChange && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold border ${getStatusColorClass(
                  tireStatus
                )}`}
              >
                {getStatusText(tireStatus)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Always use onSelect if provided, otherwise make it required
  if (!onSelect) {
    console.warn('CarCard requires onSelect prop');
  }

  return (
    <div
      onClick={() => onSelect?.(car)}
      className="glass rounded-2xl p-6 hover:-translate-y-1 transition duration-200 cursor-pointer border border-border/70"
    >
      {content}
    </div>
  );
}
