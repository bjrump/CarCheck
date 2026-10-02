"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  Check,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import AppHeader, { type AppView } from "@/app/components/AppHeader";
import CarDetail, { type DetailTab } from "@/app/components/CarDetail";
import VehicleDialogs, {
  type VehicleDialog,
} from "@/app/components/VehicleDialogs";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import { useToast } from "@/app/components/ToastProvider";
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
import { errorMessage, type CarActions } from "@/app/lib/actions";
import type { Car } from "@/app/lib/types";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getCarStatus,
  getFuelSummary,
  getMaintenanceTasks,
  getStatusText,
  normalizeCalendarDate,
  todayDate,
  type MaintenanceStatus,
  type MaintenanceTask,
} from "@/app/lib/utils";

const tireLabels = {
  summer: "Sommer",
  winter: "Winter",
  "all-season": "Ganzjahr",
};
const detailTabs: DetailTab[] = [
  "overview",
  "maintenance",
  "tires",
  "fuel",
  "history",
];

function Status({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`status-text text-${status}`}>
      <span className="status-dot" />
      {getStatusText(status)}
    </span>
  );
}

function getActivity(cars: Car[]) {
  return cars
    .flatMap((car) => (car.eventLog ?? []).map((event) => ({ ...event, car })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function TaskList({
  tasks,
  cars,
  onTask,
}: {
  tasks: MaintenanceTask[];
  cars: Car[];
  onTask: (task: MaintenanceTask) => void;
}) {
  return (
    <div>
      {tasks.map((task) => {
        const car = cars.find((item) => item._id === task.carId);
        return (
          <button
            className="task-row w-full text-left hover:bg-muted/40"
            key={task.id}
            onClick={() => onTask(task)}
          >
            <span className={`task-marker text-${task.status}`}>
              <span className="status-dot" />
            </span>
            <span className="task-copy">
              <span className="task-title">
                {task.title}
                <span className={`ml-3 text-xs text-${task.status}`}>
                  {getStatusText(task.status)}
                </span>
              </span>
              <span className="task-meta">
                {car?.make} {car?.model} · {task.detail}
              </span>
            </span>
            <ChevronRight
              size={15}
              className="shrink-0 text-muted-foreground"
            />
          </button>
        );
      })}
    </div>
  );
}

function ActivityList({ cars, limit }: { cars: Car[]; limit?: number }) {
  const events = getActivity(cars);
  const visible = limit === undefined ? events : events.slice(0, limit);
  return visible.length ? (
    <ol>
      {visible.map((event) => (
        <li className="activity-row" key={`${event.car._id}:${event.id}`}>
          <span className="activity-dot" />
          <div className="min-w-0">
            <Link
              className="activity-title hover:underline"
              href={`/?car=${event.car._id}&tab=history`}
            >
              {event.description}
            </Link>
            <p className="activity-meta">
              {event.car.make} {event.car.model} · {formatDate(event.date)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <p className="py-6 text-sm text-muted-foreground">
      Deine Einträge erscheinen hier.
    </p>
  );
}

function Garage({
  cars,
  onDialog,
  onTask,
}: {
  cars: Car[];
  onDialog: (dialog: VehicleDialog) => void;
  onTask: (task: MaintenanceTask) => void;
}) {
  const [search, setSearch] = useState("");
  const tasks = getMaintenanceTasks(cars);
  const attention = tasks.filter(
    (task) => task.status === "overdue" || task.status === "upcoming",
  );
  const month = todayDate().slice(0, 7);
  const monthlyEntries = cars
    .flatMap((car) => car.fuelEntries ?? [])
    .filter((entry) => normalizeCalendarDate(entry.date)?.startsWith(month));
  const costs = getFuelSummary(monthlyEntries).totalCost;
  const filtered = cars.filter((car) =>
    `${car.make} ${car.model} ${car.licensePlate ?? ""}`
      .toLocaleLowerCase("de-DE")
      .includes(search.toLocaleLowerCase("de-DE")),
  );
  const metrics = [
    { label: "Fahrzeuge", value: cars.length, note: "in deiner Garage" },
    {
      label: "Überfällig",
      value: tasks.filter((task) => task.status === "overdue").length,
      note: "jetzt erledigen",
      status: "overdue",
    },
    {
      label: "Bald fällig",
      value: tasks.filter((task) => task.status === "upcoming").length,
      note: "in 30 Tagen oder 1.000 km",
      status: "upcoming",
    },
    {
      label: "Tankkosten",
      value: costs === null ? "–" : formatCurrency(costs),
      note: monthlyEntries.some(
        (entry) =>
          entry.totalCost === undefined && entry.pricePerLiter === undefined,
      )
        ? "diesen Monat · Preise fehlen"
        : "diesen Monat",
    },
  ];
  return (
    <main className="garage-main">
      <div className="page-heading">
        <div>
          <h1>Deine Garage</h1>
          <p>Alles im Blick. Bereit für die nächste Fahrt.</p>
        </div>
        <Button onClick={() => onDialog({ kind: "vehicle" })}>
          <Plus />
          Fahrzeug hinzufügen
        </Button>
      </div>
      <div className="metrics">
        {metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <p className="metric-label">{metric.label}</p>
            <p
              className={`metric-value ${metric.status ? `text-${metric.status}` : ""}`}
            >
              {metric.value}
            </p>
            <p className="metric-note">{metric.note}</p>
          </div>
        ))}
      </div>
      <section aria-label="Deine Fahrzeuge">
        <div className="section-toolbar">
          <h2 className="section-title">
            Fahrzeuge{" "}
            <span className="ml-2 text-muted-foreground">{cars.length}</span>
          </h2>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-2.5 text-muted-foreground"
            />
            <Input
              className="search-input"
              aria-label="Fahrzeuge suchen"
              placeholder="Fahrzeuge suchen"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {filtered.length ? (
          <Table className="garage-table">
            <TableHeader>
              <TableRow>
                <TableHead>Fahrzeug</TableHead>
                <TableHead className="hide-mobile">Kilometerstand</TableHead>
                <TableHead className="hide-tablet">TÜV</TableHead>
                <TableHead className="hide-tablet">Reifen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Öffnen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((car) => {
                const tire = car.tires.find(
                  (item) => item.id === car.currentTireId,
                );
                const tuv = tasks.find(
                  (task) => task.carId === car._id && task.kind === "tuv",
                );
                return (
                  <TableRow key={car._id}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-3"
                        href={`/?car=${car._id}`}
                      >
                        <span className="vehicle-icon">
                          <CarFront size={19} />
                        </span>
                        <span>
                          <span className="vehicle-name">
                            {car.make} {car.model}
                          </span>
                          <span className="vehicle-meta">
                            {car.year}
                            {car.licensePlate && (
                              <>
                                {" "}
                                ·{" "}
                                <span className="plate">
                                  {car.licensePlate}
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hide-mobile tabular-nums">
                      {formatNumber(car.mileage)} km
                    </TableCell>
                    <TableCell className="hide-tablet">
                      {tuv ? (
                        <span className={`text-${tuv.status}`}>
                          {formatDate(tuv.date)}
                        </span>
                      ) : (
                        "Noch offen"
                      )}
                    </TableCell>
                    <TableCell className="hide-tablet">
                      {tire ? tireLabels[tire.type] : "Nicht erfasst"}
                    </TableCell>
                    <TableCell>
                      <Status status={getCarStatus(car)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/?car=${car._id}`}
                          aria-label={`${car.make} ${car.model} öffnen`}
                        >
                          <ChevronRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="empty-state">
            {cars.length ? (
              <p>Keine passenden Fahrzeuge.</p>
            ) : (
              <>
                <CarFront size={28} className="mb-4 text-muted-foreground" />
                <h3>Dein erstes Fahrzeug</h3>
                <p>
                  Trage dein Auto ein und behalte Wartung, Reifen und Tankkosten
                  im Blick.
                </p>
                <Button
                  className="mt-5"
                  onClick={() => onDialog({ kind: "vehicle" })}
                >
                  <Plus />
                  Fahrzeug hinzufügen
                </Button>
              </>
            )}
          </div>
        )}
      </section>
      <div className="below-grid">
        <section>
          <div className="section-toolbar">
            <h2 className="section-title">Als Nächstes</h2>
            <Link className="section-link" href="/?view=tasks">
              Alle Aufgaben <ArrowRight size={13} />
            </Link>
          </div>
          {attention.length ? (
            <TaskList
              tasks={attention.slice(0, 4)}
              cars={cars}
              onTask={onTask}
            />
          ) : (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Check size={15} />
              Keine offenen Aufgaben.
            </p>
          )}
        </section>
        <section>
          <div className="section-toolbar">
            <h2 className="section-title">Zuletzt eingetragen</h2>
            <Link className="section-link" href="/?view=history">
              Historie <ArrowRight size={13} />
            </Link>
          </div>
          <ActivityList cars={cars} limit={3} />
        </section>
      </div>
    </main>
  );
}

function Tasks({
  cars,
  onTask,
}: {
  cars: Car[];
  onTask: (task: MaintenanceTask) => void;
}) {
  const [includeLater, setIncludeLater] = useState(false);
  const tasks = getMaintenanceTasks(cars).filter(
    (task) => includeLater || task.status !== "current",
  );
  return (
    <main className="garage-main">
      <div className="page-heading">
        <div>
          <h1>Deine Aufgaben</h1>
          <p>Wartung und Termine für alle Fahrzeuge.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIncludeLater((value) => !value)}
          aria-pressed={includeLater}
        >
          {includeLater ? "Nur offene Aufgaben" : "Alle Termine anzeigen"}
        </Button>
      </div>
      {tasks.length ? (
        <TaskList tasks={tasks} cars={cars} onTask={onTask} />
      ) : (
        <div className="empty-state">
          <Check size={28} className="mb-4" />
          <h3>Alles erledigt</h3>
          <p>Aktuell stehen keine Aufgaben an.</p>
        </div>
      )}
    </main>
  );
}

function History({ cars }: { cars: Car[] }) {
  const [selected, setSelected] = useState("all");
  const selectedCars = cars.filter(
    (car) => selected === "all" || car._id === selected,
  );
  return (
    <main className="garage-main">
      <div className="page-heading">
        <div>
          <h1>Deine Historie</h1>
          <p>Alle Einträge an einem Ort.</p>
        </div>
        <select
          aria-label="Historie nach Fahrzeug filtern"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="all">Alle Fahrzeuge</option>
          {cars.map((car) => (
            <option key={car._id} value={car._id}>
              {car.make} {car.model}
            </option>
          ))}
        </select>
      </div>
      <ActivityList cars={selectedCars} />
    </main>
  );
}

export default function Workspace({
  cars,
  actions,
  isDemo = false,
  account,
}: {
  cars: Car[];
  actions: CarActions;
  isDemo?: boolean;
  account?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const car = cars.find((item) => item._id === params.get("car"));
  const view: AppView =
    params.get("view") === "tasks"
      ? "tasks"
      : params.get("view") === "history"
        ? "history"
        : "garage";
  const tab =
    detailTabs.find((item) => item === params.get("tab")) ?? "overview";
  const [dialog, setDialog] = useState<VehicleDialog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const demoAccount = (
    <span className="avatar" aria-label="Beispielkonto">
      BR
    </span>
  );

  function openTask(task: MaintenanceTask) {
    setDialog({
      kind:
        task.kind === "tires"
          ? "change-tires"
          : task.kind === "insurance"
            ? "vehicle"
            : task.kind,
      carId: task.carId,
    });
  }

  async function deleteCar() {
    if (!car || deleting) return;
    const accepted = await confirm({
      title: "Fahrzeug löschen?",
      message: `${car.make} ${car.model} und alle zugehörigen Einträge werden dauerhaft gelöscht.`,
      confirmText: "Fahrzeug löschen",
      variant: "danger",
    });
    if (!accepted) return;
    setDeleting(true);
    try {
      await actions.remove({ id: car._id });
      router.push("/");
      toast.success("Fahrzeug gelöscht.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="workspace-shell">
      <AppHeader
        view={car ? "garage" : view}
        account={isDemo ? demoAccount : account}
      />
      {isDemo && (
        <p className="demo-notice">Beispielgarage · Änderungen sind lokal</p>
      )}
      {car ? (
        <div className="workspace-layout">
          <aside className="vehicle-rail" aria-label="Fahrzeuge">
            <p className="rail-label">Deine Fahrzeuge</p>
            {cars.map((item) => (
              <Link
                className="rail-car"
                data-active={item._id === car._id}
                href={`/?car=${item._id}`}
                key={item._id}
              >
                <CarFront size={16} />
                <span className="min-w-0">
                  <span className="rail-car-name">
                    {item.make} {item.model}
                  </span>
                  <span className="rail-car-meta">
                    {item.licensePlate ?? item.year}
                  </span>
                </span>
                <span
                  className={`status-dot ml-auto shrink-0 text-${getCarStatus(item)}`}
                />
              </Link>
            ))}
            <Button
              className="mt-4 w-full"
              size="sm"
              variant="ghost"
              onClick={() => setDialog({ kind: "vehicle" })}
            >
              <Plus />
              Fahrzeug hinzufügen
            </Button>
          </aside>
          <CarDetail
            key={car._id}
            car={car}
            actions={actions}
            openDialog={setDialog}
            tab={tab}
            onTabChange={(value) =>
              router.replace(`/?car=${car._id}&tab=${value}`, { scroll: false })
            }
            onBack={() => router.push("/")}
            onDelete={deleteCar}
          />
        </div>
      ) : view === "tasks" ? (
        <Tasks cars={cars} onTask={openTask} />
      ) : view === "history" ? (
        <History cars={cars} />
      ) : (
        <Garage cars={cars} onDialog={setDialog} onTask={openTask} />
      )}
      <VehicleDialogs
        dialog={dialog}
        cars={cars}
        actions={actions}
        onClose={() => setDialog(null)}
        onCreated={(id) => router.push(`/?car=${id}`)}
      />
    </div>
  );
}
