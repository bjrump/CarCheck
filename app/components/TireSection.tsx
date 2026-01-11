'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Car, Tire, TireType, TireChangeEvent } from '@/app/lib/types';
import { formatDate, formatNumber } from '@/app/lib/utils';
import { useToast } from "@/app/components/ToastProvider";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";

interface TireSectionProps {
  car: Car;
  onUpdate?: (updatedCar: Car) => void;
}

export default function TireSection({ car, onUpdate }: TireSectionProps) {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [formData, setFormData] = useState<Partial<Tire>>({
    type: 'summer',
    currentMileage: 0,
    archived: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const updateCar = useMutation(api.cars.update);

  const activeTires = (car.tires || []).filter(t => !t.archived);
  const archivedTires = (car.tires || []).filter(t => t.archived);
  const currentTire = car.currentTireId ? activeTires.find(t => t.id === car.currentTireId) : null;

  // Berechne die tatsächlichen Kilometer für den aktuell montierten Reifen
  const getActualTireMileage = (tire: Tire): number => {
    if (tire.id !== car.currentTireId) {
      // Nicht montierter Reifen - gespeicherte Kilometer sind korrekt
      return tire.currentMileage;
    }

    // Finde das letzte Mount-Event für diesen Reifen
    const lastMountEvent = (car.tireChangeEvents || [])
      .filter(e => e.tireId === tire.id && e.changeType === 'mount')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!lastMountEvent) {
      // Kein Mount-Event gefunden - gespeicherte Kilometer zurückgeben
      return tire.currentMileage;
    }

    // Berechne gefahrene Kilometer seit letztem Mount
    const kmSinceMount = car.mileage - lastMountEvent.carMileage;
    return lastMountEvent.tireMileage + kmSinceMount;
  };

  const summerTires = activeTires.filter(t => t.type === 'summer');
  const winterTires = activeTires.filter(t => t.type === 'winter');
  const allSeasonTires = activeTires.filter(t => t.type === 'all-season');

  const archivedSummerTires = archivedTires.filter(t => t.type === 'summer');
  const archivedWinterTires = archivedTires.filter(t => t.type === 'winter');
  const archivedAllSeasonTires = archivedTires.filter(t => t.type === 'all-season');

  const handleAddTire = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newTire: Tire = {
        id: crypto.randomUUID(),
        type: formData.type || 'summer',
        brand: formData.brand,
        model: formData.model,
        currentMileage: parseInt(formData.currentMileage?.toString() || '0'),
        archived: false,
      };

      const updatedTires = [...(car.tires || []), newTire];

      const updatedCar = await updateCar({
        id: car._id as Id<"cars">,
        tires: updatedTires,
      });

      if (updatedCar && onUpdate) {
        onUpdate(updatedCar as Car);
      }

      setIsAdding(false);
      setFormData({
        type: 'summer',
        currentMileage: 0,
        archived: false,
      });
    } catch (error) {
      toast.error('Fehler beim Hinzufügen der Reifen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTireChange = async (tireId: string, carMileage: number, changeDate: string) => {
    setIsLoading(true);
    try {
      const events: TireChangeEvent[] = [...(car.tireChangeEvents || [])];
      const tires = [...(car.tires || [])];

      // Wenn es bereits einen montierten Reifen gibt, demontieren
      if (car.currentTireId) {
        const currentTireIndex = tires.findIndex(t => t.id === car.currentTireId);
        if (currentTireIndex >= 0) {
          // Berechne aktuelle Kilometer des demontierten Reifens
          const lastMountEvent = events
            .filter(e => e.tireId === car.currentTireId && e.changeType === 'mount')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          const tireMileageAtUnmount = lastMountEvent
            ? lastMountEvent.tireMileage + (carMileage - lastMountEvent.carMileage)
            : tires[currentTireIndex].currentMileage;

          // Aktualisiere die Kilometer des demontierten Reifens
          tires[currentTireIndex] = {
            ...tires[currentTireIndex],
            currentMileage: tireMileageAtUnmount,
          };

          // Unmount-Event erstellen
          events.push({
            id: crypto.randomUUID(),
            date: changeDate,
            carMileage: carMileage,
            tireId: car.currentTireId,
            tireMileage: tireMileageAtUnmount,
            changeType: 'unmount',
          });
        }
      }

      // Finde den zu montierenden Reifen
      const newTireIndex = tires.findIndex(t => t.id === tireId);
      if (newTireIndex < 0) {
        throw new Error('Reifen nicht gefunden');
      }

      // Mount-Event erstellen
      events.push({
        id: crypto.randomUUID(),
        date: changeDate,
        carMileage: carMileage,
        tireId: tireId,
        tireMileage: tires[newTireIndex].currentMileage,
        changeType: 'mount',
      });

      const updatedCar = await updateCar({
        id: car._id as Id<"cars">,
        mileage: carMileage,
        tires: tires,
        tireChangeEvents: events,
        currentTireId: tireId,
      });

      if (updatedCar && onUpdate) {
        onUpdate(updatedCar as Car);
      }

      setIsChanging(false);
    } catch (error) {
      toast.error('Fehler beim Reifenwechsel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveTire = async (tireId: string) => {
    const confirmed = await confirm({
      title: "Reifen archivieren",
      message: "Möchten Sie diesen Reifensatz archivieren? Er wird nicht mehr verwendet, bleibt aber gespeichert.",
      confirmText: "Archivieren",
      cancelText: "Abbrechen",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    if (car.currentTireId === tireId) {
      toast.warning('Bitte demontieren Sie die Reifen zuerst, bevor Sie sie archivieren.');
      return;
    }

    try {
      const updatedTires = (car.tires || []).map(tire => {
        if (tire.id === tireId) {
          return { ...tire, archived: true };
        }
        return tire;
      });

      const updatedCar = await updateCar({
        id: car._id as Id<"cars">,
        tires: updatedTires,
      });

      if (updatedCar && onUpdate) {
        onUpdate(updatedCar as Car);
      }
    } catch (error) {
      toast.error('Fehler beim Archivieren der Reifen');
    }
  };

  const getTireTypeLabel = (type: TireType): string => {
    switch (type) {
      case 'summer':
        return 'Sommerreifen';
      case 'winter':
        return 'Winterreifen';
      case 'all-season':
        return 'Allwetterreifen';
    }
  };

  const getTireTypeColor = (type: TireType): string => {
    switch (type) {
      case 'summer':
        return 'bg-yellow-100 text-yellow-800';
      case 'winter':
        return 'bg-blue-100 text-blue-800';
      case 'all-season':
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="glass rounded-2xl p-6 flex flex-col max-h-[600px]">
      <div className="flex justify-between items-start mb-6 flex-shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reifen</p>
          <h2 className="text-xl font-bold">Reifen-Verwaltung</h2>
          {currentTire ? (
            <p className="text-sm text-muted-foreground mt-1">
              Aktuell montiert: <span className="font-semibold text-foreground">
                {getTireTypeLabel(currentTire.type)}
                {currentTire.brand && ` (${currentTire.brand}${currentTire.model ? ' ' + currentTire.model : ''})`}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Kein Reifen montiert
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {activeTires.length > 0 && (
            <button
              onClick={() => setIsChanging(true)}
              disabled={isLoading}
              className="rounded-xl bg-green-600 px-6 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
            >
              {currentTire ? 'Reifenwechsel' : 'Reifen montieren'}
            </button>
          )}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
          >
            {isAdding ? 'Abbrechen' : 'Reifensatz hinzufügen'}
          </button>
        </div>
      </div>

      {/* Reifenwechsel-Dialog */}
      {isChanging && (
        <TireChangeDialog
          car={car}
          currentTire={currentTire || null}
          availableTires={currentTire ? activeTires.filter(t => t.id !== currentTire.id) : activeTires}
          onCancel={() => setIsChanging(false)}
          onConfirm={handleTireChange}
          isLoading={isLoading}
          getTireTypeLabel={getTireTypeLabel}
        />
      )}

      {/* Reifen hinzufügen Formular */}
      {isAdding && (
        <form onSubmit={handleAddTire} className="mb-6 p-4 rounded-xl bg-muted space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Reifentyp <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TireType })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
            >
              <option value="summer">Sommerreifen</option>
              <option value="winter">Winterreifen</option>
              <option value="all-season">Allwetterreifen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Gefahrene Kilometer <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.currentMileage}
              onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              0 = neue Reifen, sonst bereits gefahrene Kilometer der Reifen
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Marke (optional)
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value || undefined })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Modell (optional)
            </label>
            <input
              type="text"
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value || undefined })}
              className="w-full rounded-xl border border-border bg-input/60 px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-green-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Hinzufügen...' : 'Hinzufügen'}
          </button>
        </form>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        {summerTires.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${getTireTypeColor('summer')}`}>
                Sommerreifen
              </span>
            </h3>
            <div className="space-y-3">
              {summerTires.map((tire) => (
                <TireCard
                  key={tire.id}
                  tire={tire}
                  actualMileage={getActualTireMileage(tire)}
                  isCurrent={tire.id === car.currentTireId}
                  onArchive={() => handleArchiveTire(tire.id)}
                  getTireTypeLabel={getTireTypeLabel}
                  getTireTypeColor={getTireTypeColor}
                />
              ))}
            </div>
          </div>
        )}

        {winterTires.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${getTireTypeColor('winter')}`}>
                Winterreifen
              </span>
            </h3>
            <div className="space-y-3">
              {winterTires.map((tire) => (
                <TireCard
                  key={tire.id}
                  tire={tire}
                  actualMileage={getActualTireMileage(tire)}
                  isCurrent={tire.id === car.currentTireId}
                  onArchive={() => handleArchiveTire(tire.id)}
                  getTireTypeLabel={getTireTypeLabel}
                  getTireTypeColor={getTireTypeColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Allwetterreifen */}
        {allSeasonTires.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${getTireTypeColor('all-season')}`}>
                Allwetterreifen
              </span>
            </h3>
            <div className="space-y-3">
              {allSeasonTires.map((tire) => (
                <TireCard
                  key={tire.id}
                  tire={tire}
                  actualMileage={getActualTireMileage(tire)}
                  isCurrent={tire.id === car.currentTireId}
                  onArchive={() => handleArchiveTire(tire.id)}
                  getTireTypeLabel={getTireTypeLabel}
                  getTireTypeColor={getTireTypeColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archivierte Reifen */}
        {archivedTires.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Archivierte Reifen</h3>
            <p className="text-sm text-muted-foreground mb-4">Diese Reifen werden nicht mehr verwendet, bleiben aber gespeichert.</p>

            {archivedSummerTires.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getTireTypeColor('summer')}`}>
                    Sommerreifen
                  </span>
                </h4>
                <div className="space-y-2">
                  {archivedSummerTires.map((tire) => (
                    <TireCard
                      key={tire.id}
                      tire={tire}
                      actualMileage={tire.currentMileage}
                      isCurrent={false}
                      isArchived={true}
                      getTireTypeLabel={getTireTypeLabel}
                      getTireTypeColor={getTireTypeColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {archivedWinterTires.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getTireTypeColor('winter')}`}>
                    Winterreifen
                  </span>
                </h4>
                <div className="space-y-2">
                  {archivedWinterTires.map((tire) => (
                    <TireCard
                      key={tire.id}
                      tire={tire}
                      actualMileage={tire.currentMileage}
                      isCurrent={false}
                      isArchived={true}
                      getTireTypeLabel={getTireTypeLabel}
                      getTireTypeColor={getTireTypeColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {archivedAllSeasonTires.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getTireTypeColor('all-season')}`}>
                    Allwetterreifen
                  </span>
                </h4>
                <div className="space-y-2">
                  {archivedAllSeasonTires.map((tire) => (
                    <TireCard
                      key={tire.id}
                      tire={tire}
                      actualMileage={tire.currentMileage}
                      isCurrent={false}
                      isArchived={true}
                      getTireTypeLabel={getTireTypeLabel}
                      getTireTypeColor={getTireTypeColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reifenwechsel-Historie */}
      {(car.tireChangeEvents || []).length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-lg font-semibold mb-3">Reifenwechsel-Historie</h3>
          <TireHistory events={car.tireChangeEvents || []} tires={car.tires || []} getTireTypeLabel={getTireTypeLabel} />
        </div>
      )}
    </div>
  );
}

interface TireCardProps {
  tire: Tire;
  actualMileage: number;
  isCurrent: boolean;
  isArchived?: boolean;
  onArchive?: () => void;
  getTireTypeLabel: (type: TireType) => string;
  getTireTypeColor: (type: TireType) => string;
}

function TireCard({ tire, actualMileage, isCurrent, isArchived = false, onArchive, getTireTypeLabel, getTireTypeColor }: TireCardProps) {
  return (
    <div className={`p-4 border-2 rounded-xl transition ${
      isCurrent ? 'bg-green-50/70 border-green-400 shadow-soft' :
      isArchived ? 'bg-muted border-border opacity-80' :
      'bg-card border-border shadow-sm'
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded text-sm font-semibold ${getTireTypeColor(tire.type)}`}>
              {getTireTypeLabel(tire.type)}
            </span>
            {isCurrent && (
              <span className="px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white shadow-soft">
                MONTIERT
              </span>
            )}
            {isArchived && (
              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-500 text-white">
                ARCHIVIERT
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gefahrene Kilometer:</span>
              <span className="font-medium">{formatNumber(actualMileage)} km</span>
            </div>
            {tire.brand && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marke:</span>
                <span className="font-medium">{tire.brand}</span>
              </div>
            )}
            {tire.model && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modell:</span>
                <span className="font-medium">{tire.model}</span>
              </div>
            )}
          </div>
        </div>
        {!isArchived && onArchive && (
          <button
            onClick={onArchive}
            disabled={isCurrent}
            className="ml-4 text-orange-600 hover:text-orange-800 text-sm font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
            title={isCurrent ? 'Bitte zuerst demontieren' : 'Reifen archivieren'}
          >
            Archivieren
          </button>
        )}
      </div>
    </div>
  );
}

interface TireChangeDialogProps {
  car: Car;
  currentTire: Tire | null;
  availableTires: Tire[];
  onCancel: () => void;
  onConfirm: (tireId: string, carMileage: number, changeDate: string) => void;
  isLoading: boolean;
  getTireTypeLabel: (type: TireType) => string;
}

function TireChangeDialog({ car, currentTire, availableTires, onCancel, onConfirm, isLoading, getTireTypeLabel }: TireChangeDialogProps) {
  const toast = useToast();
  const [selectedTireId, setSelectedTireId] = useState<string>('');
  const [carMileage, setCarMileage] = useState<string>(car.mileage.toString());
  const [changeDate, setChangeDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const getTireDisplayName = (tire: Tire): string => {
    if (tire.brand) {
      return `${tire.brand}${tire.model ? ' ' + tire.model : ''}`;
    }
    return getTireTypeLabel(tire.type);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTireId) {
      toast.warning('Bitte wählen Sie einen Reifensatz aus');
      return;
    }
    onConfirm(selectedTireId, parseInt(carMileage), changeDate);
  };

  return (
    <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 p-4">
      <h3 className="text-lg font-semibold mb-4">
        {currentTire ? 'Reifenwechsel durchführen' : 'Reifen montieren'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {currentTire && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Aktuell montiert: <span className="font-semibold">{getTireDisplayName(currentTire)}</span>
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Datum des Reifenwechsels <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={changeDate}
            onChange={(e) => setChangeDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Aktueller Kilometerstand des Fahrzeugs <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={carMileage}
            onChange={(e) => setCarMileage(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Zu montierender Reifensatz <span className="text-red-500">*</span>
          </label>
          {availableTires.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine anderen Reifensätze verfügbar. Bitte fügen Sie zuerst einen Reifensatz hinzu.</p>
          ) : (
            <select
              value={selectedTireId}
              onChange={(e) => setSelectedTireId(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground shadow-inner focus:border-transparent focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Bitte wählen...</option>
              {availableTires.map((tire) => (
                <option key={tire.id} value={tire.id}>
                  {getTireDisplayName(tire)} - {formatNumber(tire.currentMileage)} km
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || availableTires.length === 0}
            className="rounded-xl bg-green-600 px-4 py-2 text-white font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Wechseln...' : 'Wechseln'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

interface TireHistoryProps {
  events: TireChangeEvent[];
  tires: Tire[];
  getTireTypeLabel: (type: TireType) => string;
}

function TireHistory({ events, tires, getTireTypeLabel }: TireHistoryProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTireDisplayName = (tire: Tire): string => {
    if (tire.brand) {
      return `${tire.brand}${tire.model ? ' ' + tire.model : ''} (${getTireTypeLabel(tire.type)})`;
    }
    return getTireTypeLabel(tire.type);
  };

  if (sortedEvents.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Reifenwechsel erfasst.</p>;
  }

  return (
    <div className="space-y-2">
      {sortedEvents.map((event) => {
        const tire = tires.find(t => t.id === event.tireId);
        return (
          <div key={event.id} className="p-3 rounded-xl border border-border bg-muted text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold">
                  {event.changeType === 'mount' ? 'Montiert' : 'Abmontiert'}:
                </span>
                <span className="ml-2">
                  {tire ? getTireDisplayName(tire) : 'Gelöschter Reifen'}
                </span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatDate(event.date)}</div>
                <div className="text-muted-foreground text-xs">
                  Auto: {formatNumber(event.carMileage)} km | Reifen: {formatNumber(event.tireMileage)} km
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
