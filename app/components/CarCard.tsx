import { Car } from "@/app/lib/types";
import {
  calculateNextTireChangeDate,
  formatDate,
  formatNumber,
  getMaintenanceStatus,
  getStatusColorClass,
  getStatusText,
} from "@/app/lib/utils";
import Link from "next/link";

interface CarCardProps {
  car: Car;
  onSelect?: (car: Car) => void;
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
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {car.year}
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            {car.make} {car.model}
          </h2>
          {car.licensePlate && (
            <p className="text-sm text-muted-foreground mt-1">
              Kennzeichen: {car.licensePlate}
            </p>
          )}
        </div>
        <span className="text-3xl font-bold text-accent">
          {formatNumber(car.mileage)} km
        </span>
      </div>

      <div className="space-y-2 mt-4">
        {/* TÜV */}
        <div className="rounded-xl bg-muted/60 px-3 py-2">
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
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getStatusColorClass(
                tuvStatus
              )}`}
            >
              {getStatusText(tuvStatus)}
            </span>
          </div>
        </div>

        {/* Inspektion */}
        <div className="rounded-xl bg-muted/60 px-3 py-2">
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
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getStatusColorClass(
                inspectionStatus
              )}`}
            >
              {getStatusText(inspectionStatus)}
            </span>
          </div>
        </div>

        {/* Reifen */}
        <div className="rounded-xl bg-muted/60 px-3 py-2">
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
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getStatusColorClass(
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

  if (onSelect) {
    return (
      <div
        onClick={() => onSelect(car)}
        className="glass rounded-2xl p-6 hover:-translate-y-1 transition duration-200 cursor-pointer"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/cars/${car.id}`}
      className="glass rounded-2xl p-6 hover:-translate-y-1 transition duration-200 cursor-pointer block"
    >
      {content}
    </Link>
  );
}
