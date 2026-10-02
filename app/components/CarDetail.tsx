"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDot,
  Gauge,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import type { Car, CarEvent, FuelEntry, Tire, TireType } from "@/app/lib/types";
import { errorMessage, type CarActions } from "@/app/lib/actions";
import {
  AB_ZIELE_INTERVAL_KM,
  formatCurrency,
  formatDate,
  formatNumber,
  getCarStatus,
  getFuelSummary,
  getInspectionState,
  getMaintenanceStatus,
  getMaintenanceTasks,
  getStatusText,
  getTireMileage,
  normalizeCalendarDate,
  type MaintenanceStatus,
  type FuelStop,
} from "@/app/lib/utils";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import { useToast } from "@/app/components/ToastProvider";
import type { VehicleDialog } from "@/app/components/VehicleDialogs";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

export type DetailTab =
  | "overview"
  | "maintenance"
  | "tires"
  | "fuel"
  | "history";

interface CarDetailProps {
  car: Car;
  actions: CarActions;
  openDialog: (dialog: VehicleDialog) => void;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onBack: () => void;
  onDelete: () => void;
}

type ViewProps = Pick<CarDetailProps, "car" | "openDialog">;

const detailTabs = [
  { value: "overview", label: "Übersicht" },
  { value: "maintenance", label: "Wartung" },
  { value: "tires", label: "Reifen" },
  { value: "fuel", label: "Tankbuch" },
  { value: "history", label: "Historie" },
] satisfies { value: DetailTab; label: string }[];

const tireLabels: Record<TireType, string> = {
  summer: "Sommerreifen",
  winter: "Winterreifen",
  "all-season": "Ganzjahresreifen",
};

const eventLabels: Record<CarEvent["type"], string> = {
  car_created: "Fahrzeug hinzugefügt",
  car_updated: "Fahrzeugdaten",
  mileage_update: "Kilometerstand",
  tuv_update: "TÜV",
  inspection_update: "Inspektion",
  tire_change: "Reifen",
  insurance_update: "Versicherung",
  fuel_entry: "Tankbuch",
};

const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const price = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function tireName(tire: Tire) {
  return (
    [tire.brand, tire.model].filter(Boolean).join(" ") || tireLabels[tire.type]
  );
}

function Status({
  status,
  label,
}: {
  status: MaintenanceStatus;
  label?: string;
}) {
  return (
    <span
      className={`status ${status === "none" ? "text-muted-foreground" : `text-${status}`}`}
    >
      <span className="status-dot" aria-hidden="true" />
      {label ?? getStatusText(status)}
    </span>
  );
}

function Overview({
  car,
  openDialog,
  onTabChange,
}: ViewProps & Pick<CarDetailProps, "onTabChange">) {
  const inspection = getInspectionState(car);
  const mounted = car.tires.find((tire) => tire.id === car.currentTireId);
  const tasks = getMaintenanceTasks([car]);
  const fuel = getFuelSummary(car.fuelEntries ?? []);
  const tireTask = tasks.find((task) => task.kind === "tires");
  const tuvTask = tasks.find((task) => task.kind === "tuv");
  const summaries = [
    {
      kind: "tuv",
      title: "Hauptuntersuchung",
      icon: ShieldCheck,
      note: "Nächster TÜV",
      value: tuvTask?.date ? formatDate(tuvTask.date) : "Noch offen",
      status: tuvTask?.status ?? "none",
      action: () => openDialog({ kind: "tuv", carId: car._id }),
      button: "TÜV eintragen",
    },
    {
      kind: "inspection",
      title: "Inspektion",
      icon: Wrench,
      note:
        inspection.remainingKm === null
          ? "Nächster Service"
          : inspection.remainingKm <= 0
            ? `${formatNumber(Math.abs(inspection.remainingKm))} km überschritten`
            : `Noch ${formatNumber(inspection.remainingKm)} km`,
      value: inspection.date
        ? `${formatDate(inspection.date)}${inspection.isEstimate ? " ≈" : ""}`
        : inspection.status === "overdue"
          ? "Jetzt fällig"
          : "Noch offen",
      status: inspection.status,
      action: () => openDialog({ kind: "inspection", carId: car._id }),
      button: "Service eintragen",
    },
    {
      kind: "tires",
      title: "Bereifung",
      icon: CircleDot,
      note: "Aktuell montiert",
      value: mounted ? tireLabels[mounted.type] : "Keine Reifen",
      status: tireTask?.status ?? (mounted ? "current" : "none"),
      action: () => onTabChange("tires"),
      button: "Reifen verwalten",
    },
  ] satisfies {
    kind: string;
    title: string;
    icon: typeof ShieldCheck;
    note: string;
    value: string;
    status: MaintenanceStatus;
    action: () => void;
    button: string;
  }[];

  return (
    <>
      <div className="detail-section flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Kilometerstand</p>
          <p className="mt-2 text-4xl font-medium tracking-tight tabular-nums">
            {formatNumber(car.mileage)}{" "}
            <span className="text-base text-muted-foreground">km</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog({ kind: "mileage", carId: car._id })}
        >
          Aktualisieren
          <ArrowUpRight />
        </Button>
      </div>
      <section className="detail-section">
        <div className="section-toolbar">
          <h2 className="section-title">Wartung im Blick</h2>
          <Status status={getCarStatus(car)} />
        </div>
        <div className="maintenance-grid">
          {summaries.map((item) => (
            <div className="maintenance-item" key={item.kind}>
              <h3>
                <item.icon size={15} strokeWidth={1.5} />
                {item.title}
              </h3>
              <div>
                <p className="text-xs text-muted-foreground">{item.note}</p>
                <p className="maintenance-date">{item.value}</p>
                <Status status={item.status} />
              </div>
              <Button
                size="xs"
                variant="ghost"
                className="mt-4 -ml-2 text-muted-foreground"
                onClick={item.action}
              >
                {item.button}
                <ArrowUpRight />
              </Button>
            </div>
          ))}
        </div>
        {inspection.isEstimate && (
          <p className="mt-4 text-xs text-muted-foreground">
            ≈ Geschätzter Termin aus deiner bisherigen Fahrleistung.
          </p>
        )}
      </section>
      <InsuranceSummary car={car} openDialog={openDialog} />
      <section className="detail-section">
        <div className="section-toolbar">
          <h2 className="section-title">Letzte Tankfüllungen</h2>
          <Button variant="ghost" size="xs" onClick={() => onTabChange("fuel")}>
            Tankbuch
            <ArrowUpRight />
          </Button>
        </div>
        {fuel.entries.length ? (
          <FuelTable
            entries={[...fuel.entries].reverse().slice(0, 3)}
            stops={fuel.stops}
          />
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            Noch keine Tankfüllung. Trage deine erste ein.
          </p>
        )}
      </section>
    </>
  );
}

function InsuranceSummary({ car, openDialog }: ViewProps) {
  return (
    <section className="detail-section border-t pt-6">
      <div className="section-toolbar">
        <h2 className="section-title">Versicherung</h2>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => openDialog({ kind: "vehicle", carId: car._id })}
        >
          Bearbeiten
          <ArrowUpRight />
        </Button>
      </div>
      {car.insurance ? (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <p>{car.insurance.provider}</p>
            {car.insurance.policyNumber && (
              <p className="mt-1 text-xs text-muted-foreground">
                Police {car.insurance.policyNumber}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Läuft bis {formatDate(car.insurance.expiryDate)}
            </span>
            <Status status={getMaintenanceStatus(car.insurance.expiryDate)} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine Versicherung hinterlegt.
        </p>
      )}
    </section>
  );
}

function MaintenanceView({ car, openDialog }: ViewProps) {
  const allTasks = getMaintenanceTasks([car]);
  const tasks = allTasks.filter(
    (task) => task.status === "overdue" || task.status === "upcoming",
  );
  const nextTuvDate = allTasks.find((task) => task.kind === "tuv")?.date;
  const inspection = getInspectionState(car);
  const interval = car.inspection;
  function openTask(kind: (typeof tasks)[number]["kind"]) {
    openDialog({
      kind:
        kind === "insurance"
          ? "vehicle"
          : kind === "tires"
            ? "change-tires"
            : kind,
      carId: car._id,
    });
  }

  return (
    <section className="detail-section">
      <div className="section-toolbar">
        <h2 className="section-title">Offene Aufgaben</h2>
        <Status status={getCarStatus(car)} />
      </div>
      {tasks.length ? (
        tasks.map((task) => (
          <button
            key={task.id}
            className="task-row"
            onClick={() => openTask(task.kind)}
          >
            <span
              className={`task-icon text-${task.status}`}
              aria-hidden="true"
            >
              {task.kind === "tuv" || task.kind === "insurance" ? (
                <ShieldCheck size={17} strokeWidth={1.5} />
              ) : task.kind === "tires" ? (
                <CircleDot size={17} strokeWidth={1.5} />
              ) : (
                <Wrench size={17} strokeWidth={1.5} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="task-title block">{task.title}</span>
              <span className="task-meta block">{task.detail}</span>
            </span>
            <Status status={task.status} />
            <ArrowUpRight
              size={14}
              className="shrink-0 text-muted-foreground"
            />
          </button>
        ))
      ) : (
        <p className="py-5 text-sm text-muted-foreground">
          Keine offenen Aufgaben für dieses Fahrzeug.
        </p>
      )}
      <div className="mt-8 space-y-6">
        <div className="border-t pt-5">
          <div className="section-toolbar">
            <h3 className="section-title">Hauptuntersuchung</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog({ kind: "tuv", carId: car._id })}
            >
              TÜV eintragen
            </Button>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">
                Zuletzt durchgeführt
              </dt>
              <dd className="mt-2">
                {car.tuv.lastAppointmentDate
                  ? formatDate(car.tuv.lastAppointmentDate)
                  : "Noch nicht erfasst"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nächster Termin</dt>
              <dd className="mt-2">
                {nextTuvDate ? formatDate(nextTuvDate) : "Noch nicht erfasst"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="border-t pt-5">
          <div className="section-toolbar">
            <h3 className="section-title">Serviceintervalle</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog({ kind: "inspection", carId: car._id })}
            >
              Service eintragen
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {interval.intervalKm === AB_ZIELE_INTERVAL_KM
              ? "Service nach Zustand und Zeitintervall."
              : `${formatNumber(interval.intervalYears * 12)} Monate oder ${formatNumber(interval.intervalKm)} km, je nachdem, was zuerst erreicht wird.`}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">
                Letzte Inspektion
              </dt>
              <dd className="mt-2">
                {interval.lastInspectionDate
                  ? formatDate(interval.lastInspectionDate)
                  : "Noch nicht erfasst"}
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                {interval.lastInspectionMileage !== null
                  ? `${formatNumber(interval.lastInspectionMileage)} km`
                  : "Kilometerstand offen"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Nächster Service
              </dt>
              <dd className="mt-2">
                {inspection.date ? formatDate(inspection.date) : "Termin offen"}
                {inspection.isEstimate && " (geschätzt)"}
              </dd>
              <dd className="mt-1">
                <Status status={inspection.status} />
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <InsuranceSummary car={car} openDialog={openDialog} />
    </section>
  );
}

function TiresView({
  car,
  openDialog,
  pending,
  onArchive,
}: ViewProps & { pending: boolean; onArchive: (tire: Tire) => void }) {
  const mounted = car.tires.find((tire) => tire.id === car.currentTireId);
  const active = car.tires.filter((tire) => !tire.archived);
  const archived = car.tires.filter((tire) => tire.archived);
  const changes = [...car.tireChangeEvents].reverse();

  function tireTable(tires: Tire[]) {
    return (
      <Table className="garage-table">
        <TableHeader>
          <TableRow>
            <TableHead>Reifensatz</TableHead>
            <TableHead>Laufleistung</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Aktionen</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tires.map((tire) => (
            <TableRow key={tire.id}>
              <TableCell>
                <span className="block font-medium">{tireName(tire)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {tireLabels[tire.type]}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(getTireMileage(car, tire))} km
              </TableCell>
              <TableCell>
                <Status
                  status={
                    tire.archived
                      ? "none"
                      : tire.id === car.currentTireId
                        ? "current"
                        : "none"
                  }
                  label={
                    tire.archived
                      ? "Archiviert"
                      : tire.id === car.currentTireId
                        ? "Montiert"
                        : "Eingelagert"
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={
                    pending || (!tire.archived && tire.id === car.currentTireId)
                  }
                  title={
                    tire.id === car.currentTireId
                      ? "Demontiere diesen Satz zuerst."
                      : undefined
                  }
                  onClick={() => onArchive(tire)}
                >
                  {tire.archived ? "Wiederherstellen" : "Archivieren"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <section className="detail-section">
        <div className="section-toolbar flex-wrap">
          <h2 className="section-title">Deine Reifensätze</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog({ kind: "add-tire", carId: car._id })}
            >
              <Plus />
              Reifensatz
            </Button>
            <Button
              size="sm"
              onClick={() =>
                openDialog({ kind: "change-tires", carId: car._id })
              }
            >
              <CircleDot />
              {mounted ? "Reifen wechseln" : "Reifen montieren"}
            </Button>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          {mounted
            ? `${tireName(mounted)} montiert. ${formatNumber(getTireMileage(car, mounted))} km gefahren.`
            : "Aktuell ist kein Reifensatz montiert."}
        </p>
        {active.length ? (
          tireTable(active)
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            Noch kein aktiver Reifensatz. Füge deinen ersten hinzu.
          </p>
        )}
        {archived.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer py-3 text-sm">
              Archivierte Sätze ({archived.length})
            </summary>
            {tireTable(archived)}
          </details>
        )}
      </section>
      <section className="detail-section">
        <h2 className="section-title mb-4">Reifenwechsel</h2>
        {changes.length ? (
          <Table className="garage-table">
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Reifensatz</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Reifen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((event) => {
                const tire = car.tires.find((item) => item.id === event.tireId);
                return (
                  <TableRow key={event.id}>
                    <TableCell>{formatDate(event.date)}</TableCell>
                    <TableCell>
                      {event.changeType === "mount" ? "Montiert" : "Demontiert"}
                    </TableCell>
                    <TableCell>
                      {tire ? tireName(tire) : "Unbekannter Satz"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatNumber(event.carMileage)} km
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatNumber(event.tireMileage)} km
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            Noch keine Reifenwechsel erfasst.
          </p>
        )}
      </section>
    </>
  );
}

function FuelTable({
  entries,
  stops,
  pending,
  onEdit,
  onDelete,
}: {
  entries: FuelEntry[];
  stops: FuelStop[];
  pending?: boolean;
  onEdit?: (entry: FuelEntry) => void;
  onDelete?: (entry: FuelEntry) => void;
}) {
  const combinedStops = new Map(
    stops
      .filter((stop) => stop.receiptCount > 1)
      .map((stop) => [stop.entryId, stop]),
  );
  return (
    <Table className="garage-table">
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>km</TableHead>
          <TableHead>Liter</TableHead>
          <TableHead>€/l</TableHead>
          <TableHead>Kosten</TableHead>
          <TableHead>l/100 km</TableHead>
          {onEdit && <TableHead>Notiz</TableHead>}
          {onEdit && (
            <TableHead>
              <span className="sr-only">Aktionen</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const combined = combinedStops.get(entry.id);
          return (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(entry.mileage)}
              </TableCell>
              <TableCell className="tabular-nums">
                {decimal.format(entry.liters)} l
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {entry.pricePerLiter !== undefined
                  ? `${price.format(entry.pricePerLiter)} €`
                  : entry.totalCost !== undefined && entry.liters > 0
                    ? `${price.format(entry.totalCost / entry.liters)} €`
                    : "Offen"}
              </TableCell>
              <TableCell className="tabular-nums">
                {entry.totalCost !== undefined
                  ? formatCurrency(entry.totalCost)
                  : "Offen"}
              </TableCell>
              <TableCell className="tabular-nums">
                {entry.consumption !== undefined
                  ? decimal.format(entry.consumption)
                  : "–"}
                {entry.kmDriven !== undefined && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatNumber(entry.kmDriven)} km
                    {combined && (
                      <> · {combined.receiptCount} Belege / {decimal.format(combined.liters)} l</>
                    )}
                  </span>
                )}
              </TableCell>
              {onEdit && (
                <TableCell className="max-w-52 whitespace-normal text-muted-foreground">
                  {entry.notes || "–"}
                </TableCell>
              )}
              {onEdit && (
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Tankfüllung vom ${formatDate(entry.date)} bearbeiten`}
                      disabled={pending}
                      onClick={() => onEdit(entry)}
                    >
                      <Pencil />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Tankfüllung vom ${formatDate(entry.date)} löschen`}
                        disabled={pending}
                        onClick={() => onDelete(entry)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MonthlyFuel({ entries, stops }: {
  entries: FuelEntry[];
  stops: FuelStop[];
}) {
  const months = new Map<string, FuelEntry[]>();
  for (const entry of entries) {
    const date = normalizeCalendarDate(entry.date);
    if (!date) continue;
    const key = date.slice(0, 7);
    const month = months.get(key) ?? [];
    month.push(entry);
    months.set(key, month);
  }
  if (!months.size) return null;

  return (
    <section className="detail-section">
      <h2 className="section-title mb-4">Nach Monat</h2>
      <Table className="garage-table">
        <TableHeader>
          <TableRow>
            <TableHead>Monat</TableHead>
            <TableHead>Distanz</TableHead>
            <TableHead>Liter</TableHead>
            <TableHead>Kosten</TableHead>
            <TableHead>Ø €/l</TableHead>
            <TableHead>Ø l/100 km</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...months]
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, fills]) => {
              const summary = getFuelSummary(fills);
              const intervals = stops.filter(
                (stop) =>
                  normalizeCalendarDate(stop.date)?.startsWith(month) &&
                  stop.kmDriven !== undefined,
              );
              const km = intervals.reduce(
                (sum, entry) => sum + (entry.kmDriven ?? 0),
                0,
              );
              const consumed = intervals.reduce(
                (sum, entry) => sum + entry.liters,
                0,
              );
              const label = new Date(`${month}-01T12:00:00`).toLocaleDateString(
                "de-DE",
                { month: "long", year: "numeric" },
              );
              const hasMissingPrice = fills.some(
                (entry) => entry.totalCost === undefined,
              );
              return (
                <TableRow key={month}>
                  <TableCell>{label}</TableCell>
                  <TableCell>
                    {km > 0 ? `${formatNumber(km)} km` : "–"}
                  </TableCell>
                  <TableCell>{decimal.format(summary.totalLiters)} l</TableCell>
                  <TableCell>
                    {summary.totalCost === null ? (
                      "Offen"
                    ) : (
                      <>
                        {formatCurrency(summary.totalCost)}
                        {hasMissingPrice && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            unvollständig
                          </span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {summary.averagePrice === null
                      ? "–"
                      : `${price.format(summary.averagePrice)} €`}
                  </TableCell>
                  <TableCell>
                    {km > 0 ? decimal.format((consumed / km) * 100) : "–"}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </section>
  );
}

function FuelView({
  car,
  openDialog,
  pending,
  onDelete,
}: ViewProps & { pending: boolean; onDelete: (entry: FuelEntry) => void }) {
  const fuel = getFuelSummary(car.fuelEntries ?? []);
  const missingPrices = fuel.entries.filter(
    (entry) => entry.totalCost === undefined,
  ).length;
  const metrics = [
    {
      label: "Tankfüllungen",
      value: formatNumber(fuel.entries.length),
      note: "insgesamt",
    },
    {
      label: "Getankte Liter",
      value: `${decimal.format(fuel.totalLiters)} l`,
      note: "alle Tankfüllungen",
    },
    {
      label: "Tankkosten",
      value: fuel.totalCost === null ? "Offen" : formatCurrency(fuel.totalCost),
      note: missingPrices
        ? `${missingPrices} ${missingPrices === 1 ? "Preis fehlt" : "Preise fehlen"}`
        : "insgesamt",
    },
    {
      label: "Gefahren",
      value: `${formatNumber(fuel.totalKm)} km`,
      note: "zwischen Tankfüllungen",
    },
    {
      label: "Ø Verbrauch",
      value:
        fuel.averageConsumption === null
          ? "–"
          : `${decimal.format(fuel.averageConsumption)} l`,
      note: "pro 100 km",
    },
    {
      label: "Ø Literpreis",
      value:
        fuel.averagePrice === null
          ? "–"
          : `${price.format(fuel.averagePrice)} €`,
      note: "für erfasste Preise",
    },
  ];

  return (
    <>
      <section className="detail-section">
        <div className="section-toolbar">
          <h2 className="section-title">Tankbuch</h2>
          <Button
            size="sm"
            onClick={() => openDialog({ kind: "fuel", carId: car._id })}
          >
            <Plus />
            Tankfüllung
          </Button>
        </div>
        <div className="metrics fuel-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="metric">
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
              <p className="metric-note">{metric.note}</p>
            </div>
          ))}
        </div>
        {fuel.entries.length ? (
          <FuelTable
            entries={[...fuel.entries].reverse()}
            stops={fuel.stops}
            pending={pending}
            onEdit={(entry) =>
              openDialog({ kind: "fuel", carId: car._id, entryId: entry.id })
            }
            onDelete={onDelete}
          />
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            Noch keine Tankfüllung. Mit deinem zweiten Eintrag siehst du auch
            deinen Verbrauch.
          </p>
        )}
        {fuel.entries.length === 1 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Mit deinem zweiten Eintrag lässt sich der Verbrauch zwischen den
            Tankfüllungen berechnen.
          </p>
        )}
        {fuel.entries.length > 1 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Der Verbrauch setzt vollständige Einträge und vergleichbare
            Volltankungen voraus. Belege bei gleichem Kilometerstand zählen als
            ein Tankstopp. Sein Verbrauch steht am letzten Beleg und zählt in
            dessen Monat.
          </p>
        )}
      </section>
      <MonthlyFuel entries={fuel.entries} stops={fuel.stops} />
    </>
  );
}

function HistoryView({ car }: { car: Car }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const events = [...(car.eventLog ?? [])]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));
  const filtered = events.filter(
    (event) =>
      (filter === "all" || event.type === filter) &&
      `${event.description} ${eventLabels[event.type]} ${formatDate(event.date)}`
        .toLocaleLowerCase("de-DE")
        .includes(search.toLocaleLowerCase("de-DE")),
  );

  return (
    <section className="detail-section">
      <div className="section-toolbar flex-wrap">
        <h2 className="section-title">Fahrzeughistorie</h2>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Historie nach Eintrag filtern"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Alle Einträge</option>
            {Object.entries(eventLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-2.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="search-input"
              placeholder="Historie suchen"
              aria-label="Historie suchen"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>
      {filtered.length ? (
        <ol>
          {filtered.map((event) => (
            <li className="activity-row" key={event.id}>
              <time
                className="w-20 shrink-0 pt-0.5 text-xs text-muted-foreground"
                dateTime={event.date}
              >
                {formatDate(event.date)}
              </time>
              <div className="min-w-0">
                <p className="text-sm">{event.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {eventLabels[event.type]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-5 text-sm text-muted-foreground">
          {events.length
            ? "Keine passenden Einträge."
            : "Noch keine Ereignisse erfasst."}
        </p>
      )}
    </section>
  );
}

export default function CarDetail({
  car,
  actions,
  openDialog,
  tab,
  onTabChange,
  onBack,
  onDelete,
}: CarDetailProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();
  const toast = useToast();

  async function setArchived(tire: Tire) {
    if (pending || (!tire.archived && tire.id === car.currentTireId)) return;
    const accepted = await confirm({
      title: tire.archived
        ? "Reifensatz wiederherstellen?"
        : "Reifensatz archivieren?",
      message: tire.archived
        ? `${tireName(tire)} steht danach wieder für einen Reifenwechsel bereit.`
        : `${tireName(tire)} bleibt mit seiner Laufleistung und Historie gespeichert.`,
      confirmText: tire.archived ? "Wiederherstellen" : "Archivieren",
      variant: "info",
    });
    if (!accepted) return;
    setPending(true);
    setError(null);
    try {
      await actions.setTireArchived({
        carId: car._id,
        tireId: tire.id,
        archived: !tire.archived,
      });
      toast.success(
        tire.archived
          ? "Reifensatz wiederhergestellt."
          : "Reifensatz archiviert.",
      );
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function deleteFill(entry: FuelEntry) {
    if (pending) return;
    const accepted = await confirm({
      title: "Tankfüllung löschen?",
      message: `Die Tankfüllung vom ${formatDate(entry.date)} wird gelöscht. Der Verbrauch wird neu berechnet.`,
      confirmText: "Löschen",
      variant: "danger",
    });
    if (!accepted) return;
    setPending(true);
    setError(null);
    try {
      await actions.removeFuelEntry({ carId: car._id, entryId: entry.id });
      toast.success("Tankfüllung gelöscht.");
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      className="workspace-content min-w-0"
      aria-label={`${car.make} ${car.model}`}
    >
      <Button size="sm" variant="ghost" className="mb-6 -ml-2" onClick={onBack}>
        <ArrowLeft />
        Zur Garage
      </Button>
      <div className="detail-header">
        <div>
          <h1>
            {car.make} {car.model}
          </h1>
          <p>
            {car.year}
            {car.licensePlate && (
              <>
                {" "}
                · <span className="plate">{car.licensePlate}</span>
              </>
            )}
            {car.vin && (
              <span className="mt-1 block break-all text-xs">
                FIN {car.vin}
              </span>
            )}
          </p>
        </div>
        <div className="detail-header-actions flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog({ kind: "vehicle", carId: car._id })}
          >
            Bearbeiten
          </Button>
          <Button
            size="sm"
            onClick={() => openDialog({ kind: "fuel", carId: car._id })}
          >
            <Plus />
            Tanken
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const selected = detailTabs.find((item) => item.value === value);
          if (selected) onTabChange(selected.value);
        }}
      >
        <TabsList className="detail-tabs" aria-label="Fahrzeugbereiche">
          {detailTabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <Overview
            car={car}
            openDialog={openDialog}
            onTabChange={onTabChange}
          />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceView car={car} openDialog={openDialog} />
        </TabsContent>
        <TabsContent value="tires">
          <TiresView
            car={car}
            openDialog={openDialog}
            pending={pending}
            onArchive={setArchived}
          />
        </TabsContent>
        <TabsContent value="fuel">
          <FuelView
            car={car}
            openDialog={openDialog}
            pending={pending}
            onDelete={deleteFill}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryView car={car} />
        </TabsContent>
      </Tabs>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Gauge size={13} />
          {formatNumber(car.mileage)} km · {car.make} {car.model}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="text-danger hover:text-danger"
          disabled={pending}
          onClick={onDelete}
        >
          <Trash2 />
          Fahrzeug löschen
        </Button>
      </div>
    </main>
  );
}
