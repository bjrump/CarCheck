import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import VehicleDialogs from "@/app/components/VehicleDialogs";
import { ToastProvider } from "@/app/components/ToastProvider";
import type { CarActions } from "@/app/lib/actions";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
afterEach(cleanup);

async function fuelForm(mileage = 50000, pricePerLiter = 1.50224) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ tokenIdentifier: "fuel-form-owner" });
  const carId = await owner.mutation(api.cars.create, {
    make: "VW",
    model: "Golf",
    year: 2020,
    mileage: 51000,
    insurance: null,
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(carId, {
      fuelEntries: [
        {
          id: "receipt",
          date: "2026-01-01",
          mileage,
          liters: 50,
          pricePerLiter,
          totalCost: 75.12,
          notes: "Alter Beleg",
        },
      ],
    });
  });
  const car = (await owner.query(api.cars.list))[0];
  const actions = {
    create: vi.fn<CarActions["create"]>(),
    update: vi.fn<CarActions["update"]>(),
    remove: vi.fn<CarActions["remove"]>(),
    saveFuelEntry: vi.fn<CarActions["saveFuelEntry"]>().mockResolvedValue(car),
    removeFuelEntry: vi.fn<CarActions["removeFuelEntry"]>(),
    addTire: vi.fn<CarActions["addTire"]>(),
    setTireArchived: vi.fn<CarActions["setTireArchived"]>(),
    changeTires: vi.fn<CarActions["changeTires"]>(),
    saveTuv: vi.fn<CarActions["saveTuv"]>(),
    saveInspection: vi.fn<CarActions["saveInspection"]>(),
  } satisfies CarActions;
  render(
    <ToastProvider>
      <VehicleDialogs
        dialog={{ kind: "fuel", carId, entryId: "receipt" }}
        cars={[car]}
        actions={actions}
        onClose={vi.fn()}
      />
    </ToastProvider>,
  );
  return actions;
}

describe("fuel entry editing", () => {
  it("uses the chosen liter price when a legacy receipt disagrees with it", async () => {
    const actions = await fuelForm(50000, 1.502);
    fireEvent.change(screen.getByLabelText("Preisangabe (optional)"), {
      target: { value: "per-liter" },
    });
    expect(screen.getByText("75,10 €")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(actions.saveFuelEntry).toHaveBeenCalledOnce());
    const [args] = actions.saveFuelEntry.mock.calls[0];
    expect(args.pricePerLiter).toBe(1.502);
    expect(args).not.toHaveProperty("totalCost");
  });

  it("keeps the paid receipt total when only the note changes", async () => {
    const actions = await fuelForm();
    expect(screen.getByText("75,12 €")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Notiz (optional)"), {
      target: { value: "Neue Notiz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() =>
      expect(actions.saveFuelEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          pricePerLiter: 1.50224,
          totalCost: 75.12,
          liters: 50,
          notes: "Neue Notiz",
        }),
      ),
    );
  });

  it.each([
    ["Getankte Liter", "51", { liters: 51, pricePerLiter: 1.50224 }],
    ["Preis pro Liter (€)", "1.6", { liters: 50, pricePerLiter: 1.6 }],
  ])(
    "recalculates the cost when %s changes",
    async (label, value, expected) => {
      const actions = await fuelForm();
      fireEvent.change(screen.getByLabelText(label, { exact: false }), {
        target: { value },
      });
      fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
      await waitFor(() => expect(actions.saveFuelEntry).toHaveBeenCalledOnce());
      const [args] = actions.saveFuelEntry.mock.calls[0];
      expect(args).toMatchObject(expected);
      expect(args).not.toHaveProperty("totalCost");
    },
  );

  it("allows an unchanged legacy fractional odometer while rejecting a new one", async () => {
    const actions = await fuelForm(50000.5);
    fireEvent.change(
      screen.getByLabelText("Kilometerstand (km)", { exact: false }),
      { target: { value: "50001.5" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(actions.saveFuelEntry).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("ganze Zahl");
    fireEvent.change(
      screen.getByLabelText("Kilometerstand (km)", { exact: false }),
      { target: { value: "50000.5" } },
    );
    fireEvent.change(screen.getByLabelText("Notiz (optional)"), {
      target: { value: "Beleg geprüft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() =>
      expect(actions.saveFuelEntry).toHaveBeenCalledWith(
        expect.objectContaining({ mileage: 50000.5, notes: "Beleg geprüft" }),
      ),
    );
  });
});
