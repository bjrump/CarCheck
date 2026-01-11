import { Car } from "@/app/lib/types";
import {
  calculateNextTireChangeDate,
  formatDate,
  formatNumber,
  getMaintenanceStatus,
  getStatusBadgeClass,
  getStatusText,
} from "@/app/lib/utils";

interface CarCardProps {
  car: Car;
  onSelect: (car: Car) => void;
}

export default function CarCard({ car, onSelect }: CarCardProps) {
  const tuvStatus = getMaintenanceStatus(car.tuv.nextAppointmentDate);
  const inspectionStatus = getMaintenanceStatus(car.inspection.nextInspectionDate);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(car);
    }
  };

  return (
    <div
      onClick={() => onSelect(car)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${car.make} ${car.model} ${car.year} auswählen`}
      className="glass group relative overflow-hidden p-6 cursor-pointer animate-fade-in transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:from-white/20" />

      <div className="relative mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚗</span>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {car.year}
            </p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {car.make} {car.model}
          </h2>
          {car.licensePlate && (
            <div className="mt-2 inline-flex items-center rounded-md bg-background/50 px-2 py-1 text-xs font-mono font-medium text-muted-foreground ring-1 ring-inset ring-border/50">
              {car.licensePlate}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground mb-0.5">Laufleistung</p>
          <span className="text-2xl font-black text-accent tracking-tight">
            {formatNumber(car.mileage)} <span className="text-sm font-bold text-muted-foreground">km</span>
          </span>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TÜV</span>
            <span className="text-sm font-semibold text-foreground">
              {formatDate(car.tuv.nextAppointmentDate)}
            </span>
          </div>
          <span className={`badge ${getStatusBadgeClass(tuvStatus)} shadow-sm`}>
            {getStatusText(tuvStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inspektion</span>
            <span className="text-sm font-semibold text-foreground">
              {formatDate(car.inspection.nextInspectionDate)}
            </span>
          </div>
          <span className={`badge ${getStatusBadgeClass(inspectionStatus)} shadow-sm`}>
            {getStatusText(inspectionStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reifen</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {currentTire ? getTireTypeLabel(currentTire.type) : "Keine"}
              </span>
              {currentTire?.type !== "all-season" && nextTireChange && (
                <span className="text-xs text-muted-foreground/80">
                  • {formatDate(nextTireChange.date)}
                </span>
              )}
            </div>
          </div>
          {currentTire?.type !== "all-season" && nextTireChange ? (
            <span className={`badge ${getStatusBadgeClass(tireStatus)} shadow-sm`}>
              {getStatusText(tireStatus)}
            </span>
          ) : (
            <span className="badge badge-neutral shadow-sm">Alles ok</span>
          )}
        </div>
      </div>
    </div>
  );
}
