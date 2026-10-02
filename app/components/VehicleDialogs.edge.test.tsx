import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import VehicleDialogs, {
  type VehicleDialog,
} from "@/app/components/VehicleDialogs";
import { ToastProvider } from "@/app/components/ToastProvider";
import type { CarActions } from "@/app/lib/actions";
import type { Car } from "@/app/lib/types";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function form(
  kind: VehicleDialog["kind"],
  editVehicle = false,
  initial: Partial<
    Pick<Car, "mileage" | "tuv" | "inspection" | "tireChangeEvents">
  > = {},
) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "form-edge-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage: 51000,
    vin: "OLD-VIN",
    licensePlate: "B CC 123",
    insurance: {
      provider: "Altversicherung",
      policyNumber: "ABC",
      expiryDate: "2027-12-31",
    },
  });
  if (kind === "change-tires") {
    await t.run(async (ctx) => {
      await ctx.db.patch(carId, {
        tires: [
          {
            id: "mounted",
            type: "summer",
            currentMileage: 8000,
            archived: false,
          },
          {
            id: "spare",
            type: "winter",
            currentMileage: 2000,
            archived: false,
          },
          {
            id: "archived",
            type: "all-season",
            currentMileage: 4000,
            archived: true,
          },
        ],
        currentTireId: "mounted",
        tireChangeEvents: [
          {
            id: "previous-mount",
            date: "2024-01-01",
            carMileage: 48000,
            tireId: "mounted",
            tireMileage: 8000,
            changeType: "mount",
          },
        ],
      });
    });
  }
  await t.run(async (ctx) => {
    await ctx.db.patch(carId, initial);
  });
  const car = (await owner.query(api.cars.list))[0];
  const actions = {
    create: vi.fn<CarActions["create"]>().mockResolvedValue(carId),
    update: vi.fn<CarActions["update"]>().mockResolvedValue(car),
    remove: vi.fn<CarActions["remove"]>(),
    saveFuelEntry: vi.fn<CarActions["saveFuelEntry"]>().mockResolvedValue(car),
    removeFuelEntry: vi.fn<CarActions["removeFuelEntry"]>(),
    addTire: vi.fn<CarActions["addTire"]>().mockResolvedValue(car),
    setTireArchived: vi.fn<CarActions["setTireArchived"]>(),
    changeTires: vi.fn<CarActions["changeTires"]>().mockResolvedValue(car),
    saveTuv: vi.fn<CarActions["saveTuv"]>().mockResolvedValue(car),
    saveInspection: vi
      .fn<CarActions["saveInspection"]>()
      .mockResolvedValue(car),
  } satisfies CarActions;
  const onClose = vi.fn();
  const dialog: VehicleDialog =
    kind === "vehicle" && !editVehicle ? { kind } : { kind, carId };
  render(
    <ToastProvider>
      <VehicleDialogs
        dialog={dialog}
        cars={[car]}
        actions={actions}
        onClose={onClose}
      />
    </ToastProvider>,
  );
  return { actions, onClose, owner, carId, car };
}

function enter(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), {
    target: { value },
  });
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
}

describe("form input and calculation contracts", () => {
  const latestMaintenance = {
    tuv: {
      lastAppointmentDate: "2025-06-01",
      nextAppointmentDate: "2027-06-01",
      completed: true,
    },
    inspection: {
      lastInspectionDate: "2025-06-01",
      lastInspectionMileage: 50000,
      nextInspectionDateByYear: "2027-06-01",
      nextInspectionDateByKm: null,
      nextInspectionDate: "2027-06-01",
      intervalYears: 2,
      intervalKm: 20000,
      completed: true,
    },
  } satisfies Pick<Car, "tuv" | "inspection">;

  it.each(["tuv", "inspection"] as const)(
    "records an older %s by default without replacing the latest service basis",
    async (kind) => {
      const { actions } = await form(kind, false, latestMaintenance);
      expect(screen.getByLabelText("Eintragsart")).toHaveProperty("value", "add");
      enter(
        kind === "tuv" ? "Datum der Untersuchung" : "Datum der Inspektion",
        "2024-06-01",
      );
      if (kind === "inspection") {
        enter("Kilometerstand (km)", "49000");
        enter("Alle wie viele Jahre?", "1");
        enter("Alle wie viele Kilometer?", "15000");
        expect(screen.getByText(/70\.000 km/)).toBeTruthy();
      }
      expect(screen.getByText("01.06.2027")).toBeTruthy();
      expect(
        screen.getByText(
          "Historischer Eintrag. Die aktuelle Frist bleibt unverändert.",
        ),
      ).toBeTruthy();
      save();
      const action = kind === "tuv" ? actions.saveTuv : actions.saveInspection;
      await waitFor(() => expect(action).toHaveBeenCalledOnce());
      const [args] = action.mock.calls[0];
      expect(args).toMatchObject({ date: "2024-06-01" });
      expect(args).not.toHaveProperty("correctLast");
    },
  );

  it.each(["tuv", "inspection"] as const)(
    "prefills and explicitly marks correction of the latest %s",
    async (kind) => {
      const { actions } = await form(kind, false, latestMaintenance);
      if (kind === "inspection") {
        enter("Kilometerstand (km)", "49000");
        enter("Alle wie viele Jahre?", "3");
        enter("Alle wie viele Kilometer?", "15000");
      }
      enter("Eintragsart", "correct");
      const dateLabel =
        kind === "tuv" ? "Datum der Untersuchung" : "Datum der Inspektion";
      expect(screen.getByLabelText(dateLabel)).toHaveProperty(
        "value",
        "2025-06-01",
      );
      if (kind === "inspection") {
        expect(screen.getByLabelText("Kilometerstand (km)")).toHaveProperty(
          "value",
          "50000",
        );
        expect(screen.getByLabelText("Alle wie viele Jahre?")).toHaveProperty(
          "value",
          "2",
        );
        expect(screen.getByLabelText("Alle wie viele Kilometer?")).toHaveProperty(
          "value",
          "20000",
        );
      }
      enter(dateLabel, "2024-06-01");
      expect(screen.getByText("01.06.2026")).toBeTruthy();
      expect(
        screen.queryByText(
          "Historischer Eintrag. Die aktuelle Frist bleibt unverändert.",
        ),
      ).toBeNull();
      save();
      const action = kind === "tuv" ? actions.saveTuv : actions.saveInspection;
      await waitFor(() => expect(action).toHaveBeenCalledOnce());
      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2024-06-01", correctLast: true }),
      );
    },
  );

  it("keeps the latest inspection deadline when adding a lower mileage on the same service day", async () => {
    const { actions } = await form("inspection", false, latestMaintenance);
    enter("Datum der Inspektion", "2025-06-01");
    enter("Kilometerstand (km)", "49000");
    enter("Alle wie viele Jahre?", "1");
    expect(screen.getByText("01.06.2027")).toBeTruthy();
    expect(screen.getByText(/70\.000 km/)).toBeTruthy();
    expect(
      screen.getByText(
        "Historischer Eintrag. Die aktuelle Frist bleibt unverändert.",
      ),
    ).toBeTruthy();
    save();
    await waitFor(() => expect(actions.saveInspection).toHaveBeenCalledOnce());
    const [args] = actions.saveInspection.mock.calls[0];
    expect(args).toMatchObject({ date: "2025-06-01", mileage: 49000 });
    expect(args).not.toHaveProperty("correctLast");
  });

  it.each(["tuv", "inspection"] as const)(
    "does not offer correction for %s without a valid previous service date",
    async (kind) => {
      await form(kind, false, {
        tuv: { ...latestMaintenance.tuv, lastAppointmentDate: "2025-02-30" },
        inspection: {
          ...latestMaintenance.inspection,
          lastInspectionDate: null,
        },
      });
      expect(screen.queryByLabelText("Eintragsart")).toBeNull();
    },
  );

  it("omits an inspection mileage deadline that cannot be represented exactly", async () => {
    await form("inspection");
    enter("Datum der Inspektion", "2024-06-01");
    enter("Alle wie viele Kilometer?", String(Number.MAX_SAFE_INTEGER));
    expect(screen.getByText("01.06.2025")).toBeTruthy();
    expect(screen.queryByText(/oder bei/)).toBeNull();
  });

  it("passes a historical tire change below the current vehicle odometer to chronological backend validation", async () => {
    const { actions } = await form("change-tires", false, {
      mileage: 12000,
      tireChangeEvents: [
        {
          id: "previous-mount",
          date: "2024-01-01",
          carMileage: 10000,
          tireId: "mounted",
          tireMileage: 8000,
          changeType: "mount",
        },
      ],
    });
    enter("Reifensatz montieren", "spare");
    enter("Datum des Wechsels", "2024-06-01");
    enter("Kilometerstand (km)", "11000");
    expect(screen.getByLabelText("Kilometerstand (km)")).toHaveProperty(
      "min",
      "0",
    );
    save();
    await waitFor(() =>
      expect(actions.changeTires).toHaveBeenCalledWith(
        expect.objectContaining({
          tireId: "spare",
          date: "2024-06-01",
          mileage: 11000,
        }),
      ),
    );
  });

  it("stores fractional liters and the full three-decimal pump price, rounding only the paid total", async () => {
    const { actions, owner } = await form("fuel");
    actions.saveFuelEntry.mockImplementation((args) =>
      owner.mutation(api.cars.saveFuelEntry, args),
    );
    enter("Getankte Liter", "42.5");
    enter("Preis pro Liter (€)", "1.899");
    expect(screen.getByText("80,71 €")).toBeTruthy();
    save();
    await waitFor(() => expect(actions.saveFuelEntry).toHaveBeenCalledOnce());
    const [args] = actions.saveFuelEntry.mock.calls[0];
    expect(args).toMatchObject({
      mileage: 51000,
      liters: 42.5,
      pricePerLiter: 1.899,
    });
    expect(args).not.toHaveProperty("totalCost");
    await waitFor(async () => {
      const [car] = await owner.query(api.cars.list);
      expect(car.fuelEntries?.[0]).toMatchObject({
        liters: 42.5,
        pricePerLiter: 1.899,
        totalCost: 80.71,
      });
    });
  });

  it("rounds a total-only half-cent exactly as shown in the preview", async () => {
    const { actions, owner, onClose } = await form("fuel");
    actions.saveFuelEntry.mockImplementation((args) =>
      owner.mutation(api.cars.saveFuelEntry, args),
    );
    enter("Getankte Liter", "5");
    enter("Preisangabe (optional)", "total");
    enter("Gesamtpreis (€)", "10.075");
    expect(screen.getByText("10,08 €")).toBeTruthy();
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const [car] = await owner.query(api.cars.list);
    expect(car.fuelEntries?.[0]).toMatchObject({ liters: 5, totalCost: 10.08 });
    expect(car.fuelEntries?.[0]).not.toHaveProperty("pricePerLiter");
  });

  it("rejects an unsafe finite fuel amount inline without calling the mutation", async () => {
    const { actions } = await form("fuel");
    enter("Getankte Liter", String(Number.MAX_VALUE));
    save();
    expect(actions.saveFuelEntry).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "gültige Literzahl",
    );
  });

  it.each([
    ["Getankte Liter", "", "Literzahl"],
    ["Getankte Liter", "0", "Literzahl"],
    ["Getankte Liter", "-0.01", "Literzahl"],
    ["Getankte Liter", "1e309", "Literzahl"],
    ["Kilometerstand (km)", "50000.5", "ganze Zahl"],
    ["Kilometerstand (km)", "-1", "ganze Zahl"],
    ["Kilometerstand (km)", "9007199254740992", "ganze Zahl"],
    ["Preis pro Liter (€)", "-1", "gültigen Preis"],
  ])("rejects %s = %s before saving", async (label, value, message) => {
    const { actions } = await form("fuel");
    enter("Getankte Liter", "10");
    enter(label, value);
    save();
    expect(actions.saveFuelEntry).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(message);
  });

  it("keeps zero price distinct from an omitted price", async () => {
    const { actions } = await form("fuel");
    enter("Getankte Liter", "0.0001");
    enter("Preis pro Liter (€)", "0");
    expect(screen.getByText("0,00 €")).toBeTruthy();
    save();
    await waitFor(() =>
      expect(actions.saveFuelEntry).toHaveBeenCalledWith(
        expect.objectContaining({ liters: 0.0001, pricePerLiter: 0 }),
      ),
    );
  });

  it("omits an empty optional price and trims notes", async () => {
    const { actions } = await form("fuel");
    enter("Getankte Liter", "25.25");
    enter("Notiz (optional)", "  Tankstelle A  ");
    save();
    await waitFor(() => expect(actions.saveFuelEntry).toHaveBeenCalledOnce());
    const [args] = actions.saveFuelEntry.mock.calls[0];
    expect(args).toMatchObject({ liters: 25.25, notes: "Tankstelle A" });
    expect(args).not.toHaveProperty("pricePerLiter");
    expect(args).not.toHaveProperty("totalCost");
  });

  it("keeps historical integer fuel mileage independent of today's vehicle odometer", async () => {
    const { actions } = await form("fuel");
    enter("Datum", "2024-02-29");
    enter("Kilometerstand (km)", "49000");
    enter("Getankte Liter", "40");
    save();
    await waitFor(() =>
      expect(actions.saveFuelEntry).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2024-02-29", mileage: 49000 }),
      ),
    );
  });

  it.each(["2025-02-29", "2026-04-31", "2999-01-01"])(
    "rejects invalid or future completed date %s",
    async (date) => {
      const { actions } = await form("tuv");
      enter("Datum der Untersuchung", date);
      save();
      expect(actions.saveTuv).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("gültiges Datum");
    },
  );

  it("shows and sends the leap-day TÜV anniversary correctly", async () => {
    const { actions } = await form("tuv");
    enter("Datum der Untersuchung", "2024-02-29");
    expect(screen.getByText("28.02.2026")).toBeTruthy();
    save();
    await waitFor(() =>
      expect(actions.saveTuv).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2024-02-29" }),
      ),
    );
  });

  it("clears all optional vehicle information explicitly while preserving unrelated mileage", async () => {
    const { actions } = await form("vehicle", true);
    for (const label of [
      "Fahrgestellnummer",
      "Kennzeichen",
      "Versicherer",
      "Versicherungsnummer",
      "Ablaufdatum",
    ])
      enter(label, "");
    enter("Marke", "  Toyota  ");
    enter("Modell", "  Yaris  ");
    save();
    await waitFor(() => expect(actions.update).toHaveBeenCalledOnce());
    const [args] = actions.update.mock.calls[0];
    expect(args).toMatchObject({
      make: "Toyota",
      model: "Yaris",
      insurance: null,
      vin: null,
      licensePlate: null,
    });
    expect(args).not.toHaveProperty("mileage");
  });

  it("requires a valid provider and date when any insurance detail remains", async () => {
    const { actions } = await form("vehicle", true);
    enter("Versicherer", "   ");
    enter("Ablaufdatum", "");
    save();
    expect(actions.update).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Versicherer");
  });

  it("creates a vehicle with trimmed names, zero initial mileage and omitted empty optional fields", async () => {
    const { actions } = await form("vehicle");
    enter("Marke", "  Toyota  ");
    enter("Modell", "  Yaris  ");
    enter("Baujahr", "1886");
    enter("Fahrgestellnummer", "   ");
    enter("Kennzeichen", "   ");
    save();
    await waitFor(() =>
      expect(actions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          make: "Toyota",
          model: "Yaris",
          year: 1886,
          mileage: 0,
          insurance: null,
          vin: undefined,
          licensePlate: undefined,
        }),
      ),
    );
  });

  it("uses Berlin's new calendar year for both the form and stored vehicle", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-12-31T23:30:00.000Z"));
    const { actions, owner, onClose } = await form("vehicle");
    actions.create.mockImplementation((args) =>
      owner.mutation(api.cars.create, args),
    );
    expect(screen.getByLabelText("Baujahr")).toHaveProperty("value", "2028");
    expect(screen.getByLabelText("Baujahr")).toHaveProperty("max", "2029");
    enter("Marke", "Toyota");
    enter("Modell", "Yaris");
    enter("Baujahr", "2029");
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(actions.create).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2029 }),
    );
    const cars = await owner.query(api.cars.list);
    expect(cars.find((car) => car.make === "Toyota")?.year).toBe(2029);
  });

  it.each(["1885", "2999", "2020.5"])(
    "rejects out-of-range or fractional vehicle year %s",
    async (year) => {
      const { actions } = await form("vehicle");
      enter("Marke", "Toyota");
      enter("Modell", "Yaris");
      enter("Baujahr", year);
      save();
      expect(actions.create).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("Baujahr");
    },
  );

  it("rejects a mileage rollback without calling the backend", async () => {
    const { actions } = await form("mileage");
    enter("Neuer Kilometerstand", "50999");
    save();
    expect(actions.update).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("51.000");
  });

  it.each([
    ["Kilometerstand (km)", "51001", "51.000"],
    ["Alle wie viele Jahre?", "0", "zwischen 1 und 10"],
    ["Alle wie viele Jahre?", "11", "zwischen 1 und 10"],
    ["Alle wie viele Kilometer?", "0", "ganze Zahl"],
    ["Alle wie viele Kilometer?", "95", "Nach Zustand"],
  ])(
    "rejects incompatible inspection input %s = %s",
    async (label, value, message) => {
      const { actions } = await form("inspection");
      enter(label, value);
      save();
      expect(actions.saveInspection).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain(message);
    },
  );

  it("sends the condition-based marker without accidentally using the hidden distance field", async () => {
    const { actions } = await form("inspection");
    enter("Datum der Inspektion", "2024-02-29");
    enter("Kilometerstand (km)", "49000");
    enter("Alle wie viele Jahre?", "2");
    enter("Alle wie viele Kilometer?", "20000");
    enter("Zusätzlich fällig", "condition");
    expect(screen.queryByLabelText("Alle wie viele Kilometer?")).toBeNull();
    expect(screen.getByText("28.02.2026")).toBeTruthy();
    save();
    await waitFor(() =>
      expect(actions.saveInspection).toHaveBeenCalledWith(
        expect.objectContaining({
          date: "2024-02-29",
          mileage: 49000,
          intervalYears: 2,
          intervalKm: 95,
        }),
      ),
    );
  });

  it("adds a used tire set with its own accumulated mileage independent of the vehicle odometer", async () => {
    const { actions } = await form("add-tire");
    enter("Reifentyp", "all-season");
    enter("Hersteller (optional)", "  Continental  ");
    enter("Modell (optional)", "  ");
    enter("Bisherige Laufleistung", "60000");
    save();
    await waitFor(() =>
      expect(actions.addTire).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "all-season",
          brand: "Continental",
          model: undefined,
          currentMileage: 60000,
        }),
      ),
    );
  });

  it.each(["-1", "500.5", "9007199254740992"])(
    "rejects invalid accumulated tire mileage %s",
    async (mileage) => {
      const { actions } = await form("add-tire");
      enter("Bisherige Laufleistung", mileage);
      save();
      expect(actions.addTire).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("ganze Zahl");
    },
  );

  it("offers only mountable tire sets and requires an explicit selection", async () => {
    const { actions } = await form("change-tires");
    const values = Array.from(screen.getAllByRole("option"), (option) =>
      option.getAttribute("value"),
    );
    expect(values).toEqual(["", "spare", "__unmount__"]);
    save();
    expect(actions.changeTires).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Bitte wähle");
  });

  it("uses the selected tire command and credits driven distance when unmounting", async () => {
    const { actions, owner, onClose } = await form("change-tires");
    actions.changeTires.mockImplementation((args) =>
      owner.mutation(api.cars.changeTires, args),
    );
    enter("Reifensatz montieren", "__unmount__");
    enter("Datum des Wechsels", "2025-10-01");
    enter("Kilometerstand (km)", "51100");
    save();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(actions.changeTires).toHaveBeenCalledWith(
      expect.objectContaining({
        tireId: null,
        date: "2025-10-01",
        mileage: 51100,
      }),
    );
    const [car] = await owner.query(api.cars.list);
    expect(car.currentTireId).toBeNull();
    expect(car.mileage).toBe(51100);
    expect(
      car.tires.find((tire) => tire.id === "mounted")?.currentMileage,
    ).toBe(11100);
  });

  it("prevents a second save and closing while a mutation is pending", async () => {
    const { actions, onClose, car } = await form("fuel");
    let finish: (() => void) | undefined;
    actions.saveFuelEntry.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return car;
    });
    enter("Getankte Liter", "10");
    save();
    const saveButton = screen.getByRole("button", { name: "Speichert…" });
    const cancelButton = screen.getByRole("button", { name: "Abbrechen" });
    expect(saveButton.matches(":disabled")).toBe(true);
    expect(cancelButton.matches(":disabled")).toBe(true);
    const formElement = saveButton.closest("form");
    if (!formElement) throw new Error("Expected fuel form");
    fireEvent.submit(formElement);
    expect(actions.saveFuelEntry).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Getankte Liter").closest("fieldset")?.disabled,
    ).toBe(true);
    finish?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("shows a backend validation failure and retains entered amounts for correction", async () => {
    const { actions, onClose, owner } = await form("fuel");
    actions.saveFuelEntry.mockImplementation((args) =>
      owner.mutation(api.cars.saveFuelEntry, args),
    );
    enter("Getankte Liter", "100");
    enter("Preis pro Liter (€)", "1e100");
    save();
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some((alert) => alert.textContent?.includes("Kosten sind zu hoch.")),
      ).toBe(true),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Getankte Liter")).toHaveProperty(
      "value",
      "100",
    );
    expect(
      screen.getByRole("button", { name: "Speichern" }).closest("fieldset")
        ?.disabled,
    ).toBe(false);
  });
});
