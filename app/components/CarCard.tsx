import { Car } from '@/app/lib/types';
import { formatDate, formatNumber, getMaintenanceStatus, getStatusColorClass, getStatusText } from '@/app/lib/utils';

interface CarCardProps {
  car: Car;
  onSelect?: (car: Car) => void;
}

export default function CarCard({ car, onSelect }: CarCardProps) {
  const tuvStatus = getMaintenanceStatus(car.tuv.nextAppointmentDate);
  const inspectionStatus = getMaintenanceStatus(car.inspection.nextInspectionDate);

  return (
    <div
      onClick={() => onSelect?.(car)}
      className="glass rounded-2xl p-6 hover:-translate-y-1 transition duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {car.year}
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            {car.make} {car.model}
          </h2>
          {car.licensePlate && (
            <p className="text-sm text-muted-foreground mt-1">Kennzeichen: {car.licensePlate}</p>
          )}
        </div>
        <span className="text-3xl font-bold text-accent">
          {formatNumber(car.mileage)} km
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground">TÜV</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border ${getStatusColorClass(tuvStatus)}`}>
              {getStatusText(tuvStatus)}
            </span>
          </div>
          <p className="text-sm text-foreground mt-1">
            {formatDate(car.tuv.nextAppointmentDate)}
          </p>
        </div>

        <div className="rounded-xl bg-muted/60 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground">Inspektion</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border ${getStatusColorClass(inspectionStatus)}`}>
              {getStatusText(inspectionStatus)}
            </span>
          </div>
          <p className="text-sm text-foreground mt-1">
            {formatDate(car.inspection.nextInspectionDate)}
          </p>
        </div>
      </div>
    </div>
  );
}

