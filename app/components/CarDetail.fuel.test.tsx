import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CarDetail from "./CarDetail";
import { ConfirmDialogProvider } from "./ConfirmDialog";
import { ToastProvider } from "./ToastProvider";
import type { Car, FuelEntry } from "@/app/lib/types";
import type { CarActions } from "@/app/lib/actions";
import type { Id } from "@/convex/_generated/dataModel";

afterEach(cleanup);

function renderFuel(fuelEntries: FuelEntry[]) {
  const car: Car = {
    _id: "test-car" as Id<"cars">,
    _creationTime: 0,
    userId: "test",
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage: 10_500,
    insurance: null,
    currentTireId: null,
    tires: [],
    tireChangeEvents: [],
    tuv: {
      lastAppointmentDate: null,
      nextAppointmentDate: null,
      completed: false,
    },
    inspection: {
      lastInspectionDate: null,
      lastInspectionMileage: null,
      intervalYears: 1,
      intervalKm: 15000,
      nextInspectionDateByYear: null,
      nextInspectionDateByKm: null,
      nextInspectionDate: null,
      completed: false,
    },
    fuelEntries,
  };
  const actions: CarActions = {
    create: vi.fn<CarActions["create"]>(),
    update: vi.fn<CarActions["update"]>(),
    remove: vi.fn<CarActions["remove"]>(),
    saveFuelEntry: vi.fn<CarActions["saveFuelEntry"]>(),
    removeFuelEntry: vi.fn<CarActions["removeFuelEntry"]>(),
    addTire: vi.fn<CarActions["addTire"]>(),
    setTireArchived: vi.fn<CarActions["setTireArchived"]>(),
    changeTires: vi.fn<CarActions["changeTires"]>(),
    saveTuv: vi.fn<CarActions["saveTuv"]>(),
    saveInspection: vi.fn<CarActions["saveInspection"]>(),
  };
  render(
    <ToastProvider>
      <ConfirmDialogProvider>
        <CarDetail
          car={car}
          actions={actions}
          openDialog={vi.fn()}
          tab="fuel"
          onTabChange={vi.fn()}
          onBack={vi.fn()}
          onDelete={vi.fn()}
        />
      </ConfirmDialogProvider>
    </ToastProvider>,
  );
}

it("shows the entire split filling in the monthly consumption and keeps individual receipt costs", () => {
  renderFuel([
    { id: "baseline", date: "2026-01-01", mileage: 10000, liters: 40 },
    {
      id: "one",
      date: "2026-01-10",
      mileage: 10500,
      liters: 20,
      totalCost: 30,
    },
    {
      id: "two",
      date: "2026-01-10",
      mileage: 10500,
      liters: 20,
      totalCost: 30,
    },
  ]);
  const monthlyRow = screen.getByText("Januar 2026").closest("tr")!;
  expect(
    within(monthlyRow)
      .getAllByRole("cell")
      .map((cell) => cell.textContent?.replaceAll("\u00a0", " ")),
  ).toEqual([
    "Januar 2026",
    "500 km",
    "80 l",
    "60,00 €unvollständig",
    "1,500 €",
    "8",
  ]);
  expect(screen.getByText("8 l")).toBeTruthy();
  expect(screen.getAllByText("30,00 €")).toHaveLength(2);
});

it("assigns a split stop's consumption to its closing month while costs stay in their receipt months", () => {
  renderFuel([
    { id: "baseline", date: "2025-12-20", mileage: 10000, liters: 40 },
    {
      id: "one",
      date: "2026-01-31",
      mileage: 10500,
      liters: 20,
      totalCost: 30,
    },
    {
      id: "two",
      date: "2026-02-01",
      mileage: 10500,
      liters: 20,
      totalCost: 30,
    },
  ]);
  const january = screen.getByText("Januar 2026").closest("tr")!;
  const february = screen.getByText("Februar 2026").closest("tr")!;
  const cells = (row: HTMLElement) =>
    within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent?.replaceAll("\u00a0", " "));
  expect(cells(january)).toEqual([
    "Januar 2026",
    "–",
    "20 l",
    "30,00 €",
    "1,500 €",
    "–",
  ]);
  expect(cells(february)).toEqual([
    "Februar 2026",
    "500 km",
    "20 l",
    "30,00 €",
    "1,500 €",
    "8",
  ]);
  expect(screen.getByText("500 km · 2 Belege / 40 l")).toBeTruthy();
});
