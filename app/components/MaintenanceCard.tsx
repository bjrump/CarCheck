import { Car } from '@/app/lib/types';
import { formatDate, getMaintenanceStatus, getStatusColorClass, getStatusText, calculateTimeProgress, calculateKmProgress, formatTimeElapsed, formatKmDriven, calculateNextTireChangeDate } from '@/app/lib/utils';
import ProgressBar from './ProgressBar';

interface MaintenanceCardProps {
  car: Car;
  type: 'tuv' | 'inspection' | 'tire-change';
  onSelect: (car: Car) => void;
  tireChangeType?: 'winter-to-summer' | 'summer-to-winter';
  tireChangeDate?: string;
  lastTireChangeDate?: string | null;
}

export default function MaintenanceCard({ car, type, onSelect, tireChangeType, tireChangeDate, lastTireChangeDate }: MaintenanceCardProps) {
  let date: string | null;
  let lastDate: string | null;
  let title: string;

  if (type === 'tire-change') {
    date = tireChangeDate || null;
    lastDate = lastTireChangeDate || null;
    title = tireChangeType === 'winter-to-summer' ? 'Reifenwechsel (Winter → Sommer)' : 'Reifenwechsel (Sommer → Winter)';
  } else {
    const maintenance = type === 'tuv' ? car.tuv : car.inspection;
    date = type === 'tuv' ? maintenance.nextAppointmentDate : maintenance.nextInspectionDate;
    lastDate = type === 'tuv' ? maintenance.lastAppointmentDate : maintenance.lastInspectionDate;
    title = type === 'tuv' ? 'TÜV-Termin' : 'Inspektion';
  }

  const status = getMaintenanceStatus(date);

  const timeProgress = type === 'tire-change'
    ? calculateTimeProgress(lastDate, date)
    : type === 'tuv'
    ? calculateTimeProgress(car.tuv.lastAppointmentDate, car.tuv.nextAppointmentDate)
    : calculateTimeProgress(car.inspection.lastInspectionDate, car.inspection.nextInspectionDate);

  const kmProgress = type === 'inspection' && car.inspection.lastInspectionMileage !== null
    ? calculateKmProgress(car.inspection.lastInspectionMileage, car.mileage, car.inspection.intervalKm)
    : null;

  return (
    <div
      onClick={() => onSelect(car)}
      className={`glass rounded-2xl p-4 border-2 ${getStatusColorClass(status)} hover:-translate-y-1 transition duration-200 cursor-pointer`}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <p className="text-sm text-foreground mt-1 font-semibold">
            {car.make} {car.model}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Nächster Termin: {formatDate(date)}
          </p>
          {lastDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Letzter: {formatDate(lastDate)}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded text-sm font-semibold border ${getStatusColorClass(status)} shrink-0`}>
          {getStatusText(status)}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
        <ProgressBar
          progress={timeProgress}
          label="Zeit"
          value={type === 'tire-change'
            ? formatTimeElapsed(lastDate, date)
            : type === 'tuv'
            ? formatTimeElapsed(car.tuv.lastAppointmentDate, car.tuv.nextAppointmentDate)
            : formatTimeElapsed(car.inspection.lastInspectionDate, car.inspection.nextInspectionDate)
          }
          color={status === 'overdue' ? 'danger' : status === 'upcoming' ? 'warning' : 'success'}
        />
        {kmProgress !== null && type === 'inspection' && car.inspection.lastInspectionMileage !== null && (
          <ProgressBar
            progress={kmProgress}
            label="Kilometer"
            value={formatKmDriven(car.inspection.lastInspectionMileage, car.mileage)}
            color={kmProgress >= 100 ? 'danger' : kmProgress >= 80 ? 'warning' : 'success'}
          />
        )}
      </div>
    </div>
  );
}

