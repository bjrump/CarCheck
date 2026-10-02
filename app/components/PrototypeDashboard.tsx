"use client";

// Throwaway: compare three v2 layouts on the existing / route with ?variant=A|B|C.
// All actions use session-only examples. The selected design will be reimplemented.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CarFront, Check, ChevronLeft, ChevronRight, CircleDot, Fuel, History, Moon, Plus, Search, ShieldCheck, Sun, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

type Variant = "A" | "B" | "C";
type Status = "overdue" | "upcoming" | "current";
type DemoCar = { id: string; make: string; model: string; year: number; plate: string; mileage: number; tuv: string; service: string; tire: string };
type DemoTask = { id: string; carId: string; title: string; kind: "inspection" | "tires" | "tuv"; status: Status; date: string; detail: string };
type DemoActivity = { date: string; title: string; detail: string };
type DemoFill = { date: string; carId: string; mileage: number; liters: number; cost: number };
type DialogState = { kind: "new-car" | "edit" | "mileage" | "fuel" | "maintenance"; carId?: string; taskId?: string };

const initialCars: DemoCar[] = [
  { id: "golf", make: "Volkswagen", model: "Golf 7", year: 2018, plate: "B CC 204", mileage: 128450, tuv: "30.10.2026", service: "12.03.2027", tire: "Sommerreifen" },
  { id: "bmw", make: "BMW", model: "320d Touring", year: 2021, plate: "M CC 320", mileage: 84200, tuv: "15.05.2027", service: "28.09.2026", tire: "Ganzjahresreifen" },
  { id: "skoda", make: "Škoda", model: "Octavia Combi", year: 2016, plate: "HH CC 18", mileage: 186320, tuv: "21.10.2026", service: "08.02.2027", tire: "Ganzjahresreifen" },
];
const initialTasks: DemoTask[] = [
  { id: "service-bmw", carId: "bmw", title: "Inspektion", kind: "inspection", status: "overdue", date: "28.09.2026", detail: "Seit 4 Tagen fällig · noch 300 km" },
  { id: "tires-golf", carId: "golf", title: "Winterreifen montieren", kind: "tires", status: "overdue", date: "01.10.2026", detail: "Seit gestern empfohlen · Sommerreifen montiert" },
  { id: "tuv-skoda", carId: "skoda", title: "Hauptuntersuchung", kind: "tuv", status: "upcoming", date: "21.10.2026", detail: "In 19 Tagen · Termin vereinbaren" },
  { id: "tuv-golf", carId: "golf", title: "Hauptuntersuchung", kind: "tuv", status: "upcoming", date: "30.10.2026", detail: "In 28 Tagen · Termin vereinbaren" },
];
const initialActivity: DemoActivity[] = [
  { date: "Heute", title: "Kilometerstand aktualisiert", detail: "Volkswagen Golf 7 · 128.450 km" },
  { date: "28.09.", title: "Tankfüllung eingetragen", detail: "BMW 320d Touring · 42,8 l · 70,19 €" },
  { date: "24.09.", title: "Tankfüllung eingetragen", detail: "Volkswagen Golf 7 · 46,2 l · 80,85 €" },
];
const initialFills: DemoFill[] = [
  { date: "28.09.2026", carId: "bmw", mileage: 83950, liters: 42.8, cost: 70.19 },
  { date: "24.09.2026", carId: "golf", mileage: 128020, liters: 46.2, cost: 80.85 },
  { date: "20.09.2026", carId: "skoda", mileage: 185890, liters: 43.5, cost: 75.45 },
  { date: "12.09.2026", carId: "golf", mileage: 127330, liters: 44.8, cost: 77.5 },
];
const variantNames = { A: "Kompakte Garage", B: "Aufgaben zuerst", C: "Fahrzeug-Arbeitsansicht" };
const taskIcons: Record<DemoTask["kind"], LucideIcon> = { inspection: Wrench, tires: CircleDot, tuv: ShieldCheck };
const number = (value: number) => new Intl.NumberFormat("de-DE").format(value);
const euro = (value: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
const carName = (car: DemoCar) => `${car.make} ${car.model}`;

function StatusText({ status, label }: { status: Status; label?: string }) {
  return <span className={`status text-${status}`}><span className="status-dot" />{label ?? { overdue: "Fällig", upcoming: "Bald fällig", current: "Alles aktuell" }[status]}</span>;
}

function TaskRow({ task, car, onOpen }: { task: DemoTask; car: DemoCar; onOpen: () => void }) {
  const Icon = taskIcons[task.kind];
  return <button className="task-row group" onClick={onOpen}>
    <span className={`task-icon text-${task.status}`}><Icon size={16} strokeWidth={1.5} /></span>
    <span className="flex-1"><span className="task-title">{task.title}</span><span className="task-meta block">{carName(car)} · {task.detail}</span></span>
    <span className="hidden text-xs text-muted-foreground sm:block">{task.date}</span>
    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground" />
  </button>;
}

function Activity({ items }: { items: DemoActivity[] }) {
  return <div>{items.map((item, index) => <div className="activity-row" key={`${item.title}-${index}`}><span className="activity-date">{item.date}</span><div><p className="task-title">{item.title}</p><p className="task-meta">{item.detail}</p></div></div>)}</div>;
}

type ViewProps = {
  cars: DemoCar[]; tasks: DemoTask[]; activity: DemoActivity[]; fills: DemoFill[];
  open: (dialog: DialogState) => void; select: (id: string) => void;
};

function Metrics({ cars, tasks, fills }: Pick<ViewProps, "cars" | "tasks" | "fills">) {
  const items = [
    { label: "Fahrzeuge", value: cars.length, note: "in deiner Garage", icon: CarFront },
    { label: "Jetzt fällig", value: tasks.filter(t => t.status === "overdue").length, note: "offene Aufgaben", icon: Wrench, status: "overdue" },
    { label: "Demnächst", value: tasks.filter(t => t.status === "upcoming").length, note: "in den nächsten 30 Tagen", icon: CalendarDays, status: "upcoming" },
    { label: "Tankkosten", value: euro(fills.filter(f => f.date.endsWith("09.2026")).reduce((sum, f) => sum + f.cost, 0)), note: "September 2026", icon: Fuel },
  ];
  return <div className="metrics">{items.map(item => <div className="metric" key={item.label}><div className="metric-label"><item.icon size={13} strokeWidth={1.5} />{item.label}</div><div className={`metric-value ${item.status ? `text-${item.status}` : ""}`}>{item.value}</div><div className="metric-note">{item.note}</div></div>)}</div>;
}

function VariantA(props: ViewProps) {
  const [search, setSearch] = useState("");
  const filtered = props.cars.filter(car => `${carName(car)} ${car.plate}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="prototype-main">
    <div className="page-heading"><div><h1>Deine Garage.</h1><p>{props.cars.length} Fahrzeuge. Alles Wichtige an einem Ort.</p></div><Button size="sm" onClick={() => props.open({ kind: "new-car" })}><Plus />Fahrzeug hinzufügen</Button></div>
    <Metrics {...props} />
    <section><div className="section-toolbar"><h2 className="section-title">Fahrzeuge <span className="ml-2 text-xs font-normal text-muted-foreground">{props.cars.length}</span></h2><div className="relative"><Search size={13} className="absolute left-3 top-2.5 text-muted-foreground" /><Input className="search-input" placeholder="Fahrzeug suchen" aria-label="Fahrzeug suchen" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <Table className="garage-table"><TableHeader><TableRow><TableHead>Fahrzeug</TableHead><TableHead className="hide-mobile">Kilometerstand</TableHead><TableHead className="hide-mobile">TÜV</TableHead><TableHead className="hide-tablet hide-mobile">Bereifung</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Öffnen</span></TableHead></TableRow></TableHeader><TableBody>
        {filtered.map(car => { const tasks = props.tasks.filter(t => t.carId === car.id); const status = tasks.some(t => t.status === "overdue") ? "overdue" : tasks.length ? "upcoming" : "current"; return <TableRow key={car.id} className="cursor-pointer" onClick={() => props.select(car.id)}><TableCell><button className="flex items-center text-left" onClick={e => { e.stopPropagation(); props.select(car.id); }}><span className="vehicle-icon mr-3"><CarFront size={19} strokeWidth={1.5} /></span><span><span className="vehicle-name block">{carName(car)}</span><span className="vehicle-meta block">{car.year} · <span className="plate">{car.plate}</span></span></span></button></TableCell><TableCell className="hide-mobile tabular-nums">{number(car.mileage)} <span className="text-muted-foreground">km</span></TableCell><TableCell className="hide-mobile tabular-nums">{car.tuv}</TableCell><TableCell className="hide-tablet hide-mobile text-muted-foreground">{car.tire}</TableCell><TableCell><StatusText status={status} label={tasks.length ? `${tasks.length} ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}` : undefined} /></TableCell><TableCell><ArrowUpRight size={14} className="text-muted-foreground" /></TableCell></TableRow>; })}
      </TableBody></Table>{filtered.length === 0 && <p className="py-8 text-sm text-muted-foreground">Kein Fahrzeug gefunden.</p>}
    </section>
    <div className="below-grid"><section><div className="section-toolbar"><h2 className="section-title">Als Nächstes</h2><span className="text-xs text-muted-foreground">Nach Dringlichkeit</span></div>{props.tasks.map(task => <TaskRow key={task.id} task={task} car={props.cars.find(c => c.id === task.carId)!} onOpen={() => props.open({ kind: "maintenance", taskId: task.id, carId: task.carId })} />)}{props.tasks.length === 0 && <p className="py-5 text-sm text-muted-foreground">Alles erledigt.</p>}</section><section><h2 className="section-title mb-4">Zuletzt passiert</h2><Activity items={props.activity.slice(0, 3)} /></section></div>
  </main>;
}

function VariantB(props: ViewProps) {
  const [filter, setFilter] = useState("all");
  const filtered = props.tasks.filter(task => filter === "all" || task.status === filter);
  return <div className="queue-layout"><aside className="queue-sidebar">
    {[{ key: "all", name: "Alle Aufgaben", count: props.tasks.length }, { key: "overdue", name: "Jetzt fällig", count: props.tasks.filter(t => t.status === "overdue").length }, { key: "upcoming", name: "Demnächst", count: props.tasks.filter(t => t.status === "upcoming").length }].map(item => <button key={item.key} data-active={filter === item.key} onClick={() => setFilter(item.key)}>{item.name}<span>{item.count}</span></button>)}
    <div className="sidebar-extra"><p className="queue-sidebar-title">DEINE FAHRZEUGE</p>{props.cars.map(car => <button key={car.id} onClick={() => props.select(car.id)}><span>{car.make} {car.model.split(" ")[0]}</span><ArrowUpRight size={12} /></button>)}<Button variant="ghost" className="mt-4" onClick={() => props.open({ kind: "new-car" })}><Plus />Fahrzeug hinzufügen</Button></div>
  </aside><main className="queue-content"><div className="page-heading"><div><h1>Was steht an?</h1><p>Freitag, 2. Oktober. {props.tasks.length} offene Aufgaben.</p></div><Button variant="outline" size="sm" onClick={() => props.open({ kind: "fuel", carId: props.cars[0].id })}><Fuel />Tanken eintragen</Button></div>
    {(["overdue", "upcoming"] as const).map(status => <section className="queue-section" key={status}><h2 className={`queue-section-heading text-${status}`}><span className="status-dot" />{status === "overdue" ? "Jetzt kümmern" : "Diesen Monat"}<span className="ml-auto font-normal text-muted-foreground">{filtered.filter(t => t.status === status).length}</span></h2>{filtered.filter(t => t.status === status).map(task => <TaskRow key={task.id} task={task} car={props.cars.find(c => c.id === task.carId)!} onOpen={() => props.open({ kind: "maintenance", taskId: task.id, carId: task.carId })} />)}</section>)}
    <section className="mt-12"><h2 className="section-title">Deine Garage</h2><div className="vehicle-strip">{props.cars.map(car => <button key={car.id} onClick={() => props.select(car.id)}><p className="font-medium">{carName(car)}</p><p className="vehicle-meta">{car.plate} · {number(car.mileage)} km</p></button>)}</div></section>
    <section className="mt-10"><h2 className="section-title mb-4">Zuletzt passiert</h2><Activity items={props.activity.slice(0, 2)} /></section>
  </main></div>;
}

function FuelTable({ fills }: { fills: DemoFill[] }) {
  return <Table className="garage-table"><TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>km</TableHead><TableHead>Liter</TableHead><TableHead className="text-right">Kosten</TableHead></TableRow></TableHeader><TableBody>{fills.map((fill, index) => <TableRow key={`${fill.date}-${index}`}><TableCell>{fill.date}</TableCell><TableCell>{number(fill.mileage)}</TableCell><TableCell>{number(fill.liters)} l</TableCell><TableCell className="text-right">{euro(fill.cost)}</TableCell></TableRow>)}</TableBody></Table>;
}

function VehicleDetail(props: ViewProps & { car: DemoCar; back?: () => void }) {
  const { car } = props;
  const tasks = props.tasks.filter(t => t.carId === car.id);
  const fills = props.fills.filter(f => f.carId === car.id);
  return <main className="workspace-content">
    {props.back && <Button size="sm" variant="ghost" className="mb-6 -ml-2" onClick={props.back}><ArrowLeft />Zur Übersicht</Button>}
    <div className="detail-header"><div><h1>{carName(car)}</h1><p>{car.year} · <span className="plate">{car.plate}</span></p></div><div className="detail-header-actions flex gap-2"><Button variant="outline" size="sm" onClick={() => props.open({ kind: "edit", carId: car.id })}>Bearbeiten</Button><Button size="sm" onClick={() => props.open({ kind: "fuel", carId: car.id })}><Plus />Tanken</Button></div></div>
    <Tabs defaultValue="overview"><TabsList className="detail-tabs"><TabsTrigger value="overview">Übersicht</TabsTrigger><TabsTrigger value="maintenance">Wartung</TabsTrigger><TabsTrigger value="fuel">Tankbuch</TabsTrigger><TabsTrigger value="history">Historie</TabsTrigger></TabsList>
      <TabsContent value="overview"><div className="detail-section flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Kilometerstand</p><p className="mt-2 text-4xl font-medium tracking-tight tabular-nums">{number(car.mileage)} <span className="text-base text-muted-foreground">km</span></p></div><Button variant="outline" size="sm" onClick={() => props.open({ kind: "mileage", carId: car.id })}>Aktualisieren<ArrowUpRight /></Button></div>
        <section className="detail-section"><div className="section-toolbar"><h2 className="section-title">Wartung im Blick</h2><StatusText status={tasks.some(t => t.status === "overdue") ? "overdue" : tasks.length ? "upcoming" : "current"} /></div><div className="maintenance-grid">{[{ kind: "tuv", title: "Hauptuntersuchung", date: car.tuv, note: "Nächster TÜV", icon: ShieldCheck }, { kind: "inspection", title: "Inspektion", date: car.service, note: car.id === "bmw" ? "Noch 300 km" : "Nächster Service", icon: Wrench }, { kind: "tires", title: "Bereifung", date: car.tire, note: "Aktuell montiert", icon: CircleDot }].map(item => { const task = tasks.find(t => t.kind === item.kind); return <div className="maintenance-item" key={item.kind}><h3><item.icon size={15} strokeWidth={1.5} />{item.title}</h3><div><p className="text-xs text-muted-foreground">{item.note}</p><p className="maintenance-date">{item.date}</p><StatusText status={task?.status ?? "current"} label={task ? undefined : "Aktuell"} /></div><Button size="xs" variant="ghost" className="mt-4 -ml-2 text-muted-foreground" onClick={() => props.open({ kind: "maintenance", carId: car.id, taskId: task?.id })}>{task ? "Jetzt eintragen" : "Eintrag hinzufügen"}<ArrowUpRight /></Button></div>; })}</div></section>
        <section className="detail-section"><div className="section-toolbar"><h2 className="section-title">Letzte Tankfüllungen</h2><span className="text-xs text-muted-foreground">{euro(fills.reduce((sum, fill) => sum + fill.cost, 0))} gesamt</span></div><FuelTable fills={fills} /></section>
      </TabsContent>
      <TabsContent value="maintenance"><section className="detail-section"><div className="section-toolbar"><h2 className="section-title">Offene Wartung</h2><Button size="sm" variant="outline" onClick={() => props.open({ kind: "maintenance", carId: car.id })}><Plus />Wartung eintragen</Button></div>{tasks.map(task => <TaskRow key={task.id} task={task} car={car} onOpen={() => props.open({ kind: "maintenance", carId: car.id, taskId: task.id })} />)}{tasks.length === 0 && <p className="py-6 text-sm text-muted-foreground">Keine offenen Aufgaben für dieses Fahrzeug.</p>}<div className="mt-10 border-t pt-6"><h3 className="section-title">Serviceintervalle</h3><p className="mt-3 text-sm text-muted-foreground">12 Monate oder 15.000 km, je nachdem, was zuerst erreicht wird.</p></div></section></TabsContent>
      <TabsContent value="fuel"><section className="detail-section"><div className="section-toolbar"><h2 className="section-title">Tankbuch</h2><Button size="sm" onClick={() => props.open({ kind: "fuel", carId: car.id })}><Plus />Tankfüllung</Button></div><div className="metrics"><div className="metric"><p className="metric-label">Tankfüllungen</p><p className="metric-value">{fills.length}</p></div><div className="metric"><p className="metric-label">Getankte Liter</p><p className="metric-value">{number(fills.reduce((sum, fill) => sum + fill.liters, 0))} l</p></div><div className="metric"><p className="metric-label">Gesamtkosten</p><p className="metric-value">{euro(fills.reduce((sum, fill) => sum + fill.cost, 0))}</p></div></div><FuelTable fills={fills} /></section></TabsContent>
      <TabsContent value="history"><section className="detail-section"><h2 className="section-title mb-4">Fahrzeughistorie</h2><Activity items={props.activity.filter(item => item.detail.includes(carName(car)))} /></section></TabsContent>
    </Tabs>
  </main>;
}

function VariantC(props: ViewProps & { selectedId: string; setSelectedId: (id: string) => void }) {
  const car = props.cars.find(car => car.id === props.selectedId) ?? props.cars[0];
  return <div className="workspace-layout"><aside className="vehicle-rail"><div className="rail-heading"><span>DEINE GARAGE · {props.cars.length}</span><Button size="icon-xs" variant="ghost" aria-label="Fahrzeug hinzufügen" onClick={() => props.open({ kind: "new-car" })}><Plus /></Button></div>{props.cars.map(item => <button className="rail-car" key={item.id} data-active={item.id === car.id} onClick={() => props.setSelectedId(item.id)}><span className="vehicle-icon"><CarFront size={18} strokeWidth={1.5} /></span><span><span className="vehicle-name block">{item.make} {item.model.split(" ")[0]}</span><span className="vehicle-meta block">{item.plate}</span></span></button>)}</aside><VehicleDetail key={car.id} {...props} car={car} /></div>;
}

function LandingPreview({ enter }: { enter: () => void }) {
  return <main className="landing-preview"><div className="landing-hero"><div><h1>Dein Auto.<br />Alles im Blick.</h1><p>TÜV, Inspektion, Reifen und Tankkosten. CarCheck hält zusammen, was du sonst zusammensuchen musst.</p><Button onClick={enter}>Garage öffnen<ArrowRight /></Button><p className="!mt-4 !text-xs">Ein Auto oder mehrere. Ein Platz für alles.</p></div><div className="landing-example"><div className="flex items-center justify-between border-b pb-5"><div><p className="text-sm font-medium">Volkswagen Golf 7</p><p className="vehicle-meta">B CC 204 · 128.450 km</p></div><CarFront size={23} strokeWidth={1.5} /></div><div className="mt-5"><TaskRow task={initialTasks[1]} car={initialCars[0]} onOpen={enter} /><TaskRow task={initialTasks[3]} car={initialCars[0]} onOpen={enter} /></div><button className="mt-5 flex items-center gap-2 text-xs" onClick={enter}>Fahrzeug ansehen<ArrowUpRight size={12} /></button></div></div><div className="landing-features">{[{ icon: CalendarDays, title: "Wissen, was fällig ist.", text: "Termine und Kilometerintervalle in einer Übersicht. Die nächste Aufgabe steht zuerst." }, { icon: Fuel, title: "Kosten nachvollziehen.", text: "Tankfüllungen eintragen. Verbrauch und Ausgaben direkt beim Fahrzeug sehen." }, { icon: History, title: "Die Historie behalten.", text: "Wartung, Reifenwechsel und Kilometerstände. Zusammen statt über Notizen verteilt." }].map(item => <section key={item.title}><item.icon size={18} strokeWidth={1.5} className="mb-4 text-muted-foreground" /><h2>{item.title}</h2><p>{item.text}</p></section>)}</div></main>;
}

export default function PrototypeDashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const rawVariant = params.get("variant");
  const variant: Variant = rawVariant === "B" || rawVariant === "C" ? rawVariant : "A";
  const [cars, setCars] = useState(initialCars);
  const [tasks, setTasks] = useState(initialTasks);
  const [activity, setActivity] = useState(initialActivity);
  const [fills, setFills] = useState(initialFills);
  const [screen, setScreen] = useState<"garage" | "tasks" | "history" | "landing">("garage");
  const [selectedId, setSelectedId] = useState("golf");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [dark, setDark] = useState(true);
  const cycle = useCallback((direction: number) => {
    const variants: Variant[] = ["A", "B", "C"];
    const next = variants[(variants.indexOf(variant) + direction + 3) % 3];
    setDetailId(null); setScreen("garage"); setDialog(null);
    router.replace(`/?variant=${next}`, { scroll: false });
  }, [router, variant]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (dialog || (event.target instanceof HTMLElement && event.target.closest("input,textarea,[contenteditable],[role=tablist]"))) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); cycle(event.key === "ArrowRight" ? 1 : -1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycle, dialog]);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  const select = (id: string) => { setSelectedId(id); setDetailId(id); };
  const props: ViewProps = { cars, tasks, activity, fills, open: setDialog, select };
  const dialogCar = cars.find(car => car.id === dialog?.carId) ?? cars[0];
  const dialogTask = tasks.find(task => task.id === dialog?.taskId);
  const titles = { "new-car": "Fahrzeug hinzufügen", edit: "Fahrzeug bearbeiten", mileage: "Kilometerstand aktualisieren", fuel: "Tankfüllung eintragen", maintenance: dialogTask?.title ?? "Wartung eintragen" };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const numeric = (key: string) => Number(text(key));
    const title = titles[dialog.kind];
    let detail = carName(dialogCar);
    if (dialog.kind === "new-car") {
      const car = { id: crypto.randomUUID(), make: text("make"), model: text("model"), year: numeric("year"), plate: text("plate"), mileage: numeric("mileage"), tuv: "Nicht hinterlegt", service: "Nicht hinterlegt", tire: "Nicht hinterlegt" };
      setCars(current => [...current, car]); detail = carName(car);
    } else if (dialog.kind === "edit") {
      setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, make: text("make"), model: text("model"), plate: text("plate"), year: numeric("year") } : car));
    } else if (dialog.kind === "mileage") {
      setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, mileage: numeric("mileage") } : car));
      detail += ` · ${number(numeric("mileage"))} km`;
    } else if (dialog.kind === "fuel") {
      const [year, month, day] = text("date").split("-");
      setFills(current => [{ date: `${day}.${month}.${year}`, carId: dialogCar.id, mileage: numeric("mileage"), liters: numeric("liters"), cost: numeric("cost") }, ...current]);
      setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, mileage: Math.max(car.mileage, numeric("mileage")) } : car));
      detail += ` · ${number(numeric("liters"))} l · ${euro(numeric("cost"))}`;
    } else if (dialogTask) {
      setTasks(current => current.filter(task => task.id !== dialogTask.id));
      if (dialogTask.kind === "tires") setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, tire: "Winterreifen" } : car));
      if (dialogTask.kind === "inspection") setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, service: "02.10.2027" } : car));
      if (dialogTask.kind === "tuv") setCars(current => current.map(car => car.id === dialogCar.id ? { ...car, tuv: "02.10.2028" } : car));
    }
    setActivity(current => [{ date: "Heute", title: dialog.kind === "maintenance" ? `${title} erledigt` : title, detail }, ...current]);
    setFeedback("In der Vorschau gespeichert."); setDialog(null);
  }

  return <div className="prototype-shell">
    <header className="topbar"><button className="wordmark" onClick={() => { setScreen("garage"); setDetailId(null); }}><span className="brand-mark"><Check size={18} strokeWidth={2.5} /></span>carcheck<span className="ml-1 text-[10px] font-normal tracking-normal text-muted-foreground">v2</span></button><nav className="topbar-nav" aria-label="Hauptnavigation">{[{ key: "garage", title: "Garage" }, { key: "tasks", title: "Aufgaben" }, { key: "history", title: "Historie" }, { key: "landing", title: "Startseite" }].map(item => <button key={item.key} data-active={screen === item.key} onClick={() => { setScreen(item.key as typeof screen); setDetailId(null); }}>{item.title}</button>)}</nav><div className="flex items-center gap-3"><span className="hidden text-[11px] text-muted-foreground sm:block">2. Oktober 2026</span><Button variant="ghost" size="icon-sm" aria-label={dark ? "Helles Design" : "Dunkles Design"} onClick={() => { document.documentElement.classList.toggle("dark", !dark); setDark(!dark); }}>{dark ? <Sun size={15} /> : <Moon size={15} />}</Button><span className="avatar">BR</span></div></header>
    {screen === "landing" ? <LandingPreview enter={() => setScreen("garage")} /> : screen === "history" ? <main className="prototype-main"><div className="page-heading"><div><h1>Deine Historie.</h1><p>Was sich in deiner Garage verändert hat.</p></div></div><Activity items={activity} /></main> : screen === "tasks" ? <VariantB {...props} /> : variant === "C" ? <VariantC {...props} selectedId={selectedId} setSelectedId={setSelectedId} /> : detailId ? <VehicleDetail key={detailId} {...props} car={cars.find(car => car.id === detailId)!} back={() => setDetailId(null)} /> : variant === "B" ? <VariantB {...props} /> : <VariantA {...props} />}
    {process.env.NODE_ENV !== "production" && <div className="prototype-switcher" aria-label="Designvarianten"><button onClick={() => cycle(-1)} aria-label="Vorherige Variante"><ChevronLeft size={17} /></button><div className="prototype-switcher-label"><strong>{variant} · {variantNames[variant]}</strong><span>PROTOTYP · {cars.length} Fahrzeuge · {tasks.length} Aufgaben · nur Beispieldaten</span></div><button onClick={() => cycle(1)} aria-label="Nächste Variante"><ChevronRight size={17} /></button></div>}
    {feedback && <div className="prototype-feedback" role="status">{feedback}</div>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent key={`${dialog?.kind}-${dialog?.carId}-${dialog?.taskId}`}><DialogHeader><DialogTitle>{dialog ? titles[dialog.kind] : "Eintrag"}</DialogTitle><DialogDescription>{dialog?.kind === "new-car" ? "Lege ein Fahrzeug in der Beispielgarage an." : carName(dialogCar)}</DialogDescription></DialogHeader><form className="prototype-form mt-3" onSubmit={submit}>
      {(dialog?.kind === "new-car" || dialog?.kind === "edit") && <><div className="grid grid-cols-2 gap-4"><label>Marke<Input name="make" required defaultValue={dialog.kind === "edit" ? dialogCar.make : ""} placeholder="Volkswagen" /></label><label>Modell<Input name="model" required defaultValue={dialog.kind === "edit" ? dialogCar.model : ""} placeholder="Golf 7" /></label></div><div className="grid grid-cols-2 gap-4"><label>Baujahr<Input name="year" type="number" required min={1900} max={2027} defaultValue={dialog.kind === "edit" ? dialogCar.year : 2020} /></label><label>Kennzeichen<Input name="plate" defaultValue={dialog.kind === "edit" ? dialogCar.plate : ""} placeholder="B CC 204" /></label></div>{dialog.kind === "new-car" && <label>Kilometerstand<Input name="mileage" type="number" required min={0} defaultValue={0} /></label>}</>}
      {dialog?.kind === "mileage" && <label>Neuer Kilometerstand<Input name="mileage" autoFocus type="number" required min={dialogCar.mileage} defaultValue={dialogCar.mileage} /><span className="text-muted-foreground">Zuletzt: {number(dialogCar.mileage)} km</span></label>}
      {dialog?.kind === "fuel" && <><div className="grid grid-cols-2 gap-4"><label>Datum<Input name="date" type="date" required defaultValue="2026-10-02" /></label><label>Kilometerstand<Input name="mileage" type="number" required min={0} defaultValue={dialogCar.mileage} /></label></div><div className="grid grid-cols-2 gap-4"><label>Liter<Input name="liters" type="number" step="0.01" min="0.01" required placeholder="45,00" /></label><label>Gesamtkosten (€)<Input name="cost" type="number" step="0.01" min={0} required placeholder="78,50" /></label></div></>}
      {dialog?.kind === "maintenance" && <><label>Erledigt am<Input name="date" type="date" required defaultValue="2026-10-02" /></label><label>Kilometerstand<Input name="mileage" type="number" required min={dialogCar.mileage} defaultValue={dialogCar.mileage} /></label>{dialogTask && <p>{dialogTask.kind === "tires" ? "Winterreifen werden als montiert eingetragen." : "Der nächste Termin wird nach dem Intervall berechnet."}</p>}</>}
      <p>Designvorschau. Änderungen bleiben nur in dieser Sitzung.</p><DialogFooter><Button variant="outline" type="button" onClick={() => setDialog(null)}>Abbrechen</Button><Button type="submit">{dialog?.kind === "maintenance" ? "Als erledigt eintragen" : "Speichern"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </div>;
}
