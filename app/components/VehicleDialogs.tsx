"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Car, FuelEntry, TireType } from "@/app/lib/types";
import { errorMessage, type CarActions } from "@/app/lib/actions";
import {
  AB_ZIELE_INTERVAL_KM,
  calculateNextInspectionDateByYear,
  calculateNextTUVDate,
  formatCurrency,
  formatDate,
  formatNumber,
  roundCurrency,
  todayDate,
  toDateInput,
} from "@/app/lib/utils";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

export type VehicleDialog =
  | { kind: "vehicle"; carId?: Id<"cars"> }
  | {
      kind: "mileage" | "tuv" | "inspection" | "add-tire" | "change-tires";
      carId: Id<"cars">;
    }
  | { kind: "fuel"; carId: Id<"cars">; entryId?: string };

interface VehicleDialogsProps {
  dialog: VehicleDialog | null;
  cars: Car[];
  actions: CarActions;
  onClose: () => void;
  onCreated?: (id: Id<"cars">) => void;
}

type CarFormProps = {
  car: Car;
  actions: CarActions;
  onClose: () => void;
};

const tireLabels: Record<TireType, string> = {
  summer: "Sommerreifen",
  winter: "Winterreifen",
  "all-season": "Ganzjahresreifen",
};

export default function VehicleDialogs({
  dialog,
  cars,
  actions,
  onClose,
  onCreated,
}: VehicleDialogsProps) {
  if (!dialog) return null;

  const car = dialog.carId
    ? cars.find((candidate) => candidate._id === dialog.carId)
    : undefined;
  const key = `${dialog.kind}-${dialog.carId ?? "new"}-${dialog.kind === "fuel" ? (dialog.entryId ?? "new") : ""}`;

  if (dialog.kind === "vehicle" && !dialog.carId) {
    return (
      <VehicleForm
        key={key}
        actions={actions}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  if (!car) {
    return (
      <UnavailableDialog
        onClose={onClose}
        message="Dieses Fahrzeug ist nicht mehr verfügbar."
      />
    );
  }

  const props = { car, actions, onClose };
  switch (dialog.kind) {
    case "vehicle":
      return <VehicleForm key={key} {...props} />;
    case "mileage":
      return <MileageForm key={key} {...props} />;
    case "tuv":
      return <TuvForm key={key} {...props} />;
    case "inspection":
      return <InspectionForm key={key} {...props} />;
    case "add-tire":
      return <AddTireForm key={key} {...props} />;
    case "change-tires":
      return <ChangeTiresForm key={key} {...props} />;
    case "fuel": {
      const entry = dialog.entryId
        ? car.fuelEntries?.find((candidate) => candidate.id === dialog.entryId)
        : undefined;
      if (dialog.entryId && !entry) {
        return (
          <UnavailableDialog
            onClose={onClose}
            message="Dieser Tankeintrag ist nicht mehr verfügbar."
          />
        );
      }
      return <FuelForm key={key} {...props} entry={entry} />;
    }
  }
}

function UnavailableDialog({
  onClose,
  message,
}: {
  onClose: () => void;
  message: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eintrag nicht verfügbar</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormDialog({
  title,
  description,
  successMessage,
  validate,
  onSave,
  onClose,
  children,
}: {
  title: string;
  description: string;
  successMessage: string;
  validate: () => string | undefined;
  onSave: () => Promise<void>;
  onClose: () => void;
  children: ReactNode;
}) {
  const toast = useToast();
  const errorId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    setSubmitting(true);
    try {
      await onSave();
      toast.success(successMessage);
      onClose();
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={!submitting}
        onEscapeKeyDown={(event) => {
          if (submitting) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submit}
          aria-busy={submitting}
          aria-describedby={error ? errorId : undefined}
        >
          <fieldset disabled={submitting} className="min-w-0 space-y-4">
            {children}
            {error && (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit">
                {submitting ? "Speichert…" : "Speichern"}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InputField({
  label,
  hint,
  ...props
}: ComponentProps<typeof Input> & { label: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const hintId = `${id}-hint`;
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        {...props}
        id={id}
        aria-describedby={hint ? hintId : props["aria-describedby"]}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  hint,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        {...props}
        id={id}
        aria-describedby={hint ? hintId : props["aria-describedby"]}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {children}
      </select>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function numberValue(value: string) {
  return value.trim() ? Number(value.replace(",", ".")) : NaN;
}

function integerError(
  value: string,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  const number = numberValue(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    if (maximum === Number.MAX_SAFE_INTEGER)
      return `${label}: Bitte gib eine gültige ganze Zahl ab ${formatNumber(minimum)} ein.`;
    return `${label}: Bitte gib eine ganze Zahl zwischen ${formatNumber(minimum)} und ${formatNumber(maximum)} ein.`;
  }
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateInput(value) === value;
}

function completedDateError(value: string) {
  if (!validDate(value) || value > todayDate())
    return "Bitte wähle ein gültiges Datum bis einschließlich heute.";
}

function VehicleForm({
  car,
  actions,
  onClose,
  onCreated,
}: Omit<CarFormProps, "car"> & {
  car?: Car;
  onCreated?: (id: Id<"cars">) => void;
}) {
  const [values, setValues] = useState({
    make: car?.make ?? "",
    model: car?.model ?? "",
    year: String(car?.year ?? new Date().getFullYear()),
    mileage: "0",
    vin: car?.vin ?? "",
    licensePlate: car?.licensePlate ?? "",
    provider: car?.insurance?.provider ?? "",
    policyNumber: car?.insurance?.policyNumber ?? "",
    expiryDate: toDateInput(car?.insurance?.expiryDate ?? null),
  });
  const hasInsurance = !!(
    values.provider.trim() ||
    values.policyNumber.trim() ||
    values.expiryDate
  );

  function validate() {
    if (!values.make.trim() || !values.model.trim())
      return "Bitte gib Marke und Modell an.";
    const yearError = integerError(
      values.year,
      "Baujahr",
      1886,
      new Date().getFullYear() + 1,
    );
    if (yearError) return yearError;
    if (!car) {
      const mileageError = integerError(values.mileage, "Kilometerstand");
      if (mileageError) return mileageError;
    }
    if (
      hasInsurance &&
      (!values.provider.trim() || !validDate(values.expiryDate))
    ) {
      return "Für die Versicherung brauchst du einen Versicherer und ein gültiges Ablaufdatum.";
    }
  }

  async function save() {
    const insurance = hasInsurance
      ? {
          provider: values.provider.trim(),
          policyNumber: values.policyNumber.trim(),
          expiryDate: values.expiryDate,
        }
      : null;
    const details = {
      make: values.make.trim(),
      model: values.model.trim(),
      year: numberValue(values.year),
      insurance,
    };
    if (car) {
      await actions.update({
        id: car._id,
        ...details,
        vin: values.vin.trim() || null,
        licensePlate: values.licensePlate.trim() || null,
      });
    } else {
      const id = await actions.create({
        ...details,
        mileage: numberValue(values.mileage),
        vin: values.vin.trim() || undefined,
        licensePlate: values.licensePlate.trim() || undefined,
      });
      onCreated?.(id);
    }
  }

  return (
    <FormDialog
      title={car ? "Fahrzeug bearbeiten" : "Fahrzeug hinzufügen"}
      description={
        car
          ? `${car.make} ${car.model}`
          : "Die wichtigsten Daten für deine Garage."
      }
      successMessage={car ? "Fahrzeug gespeichert." : "Fahrzeug hinzugefügt."}
      validate={validate}
      onSave={save}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Marke"
          required
          autoComplete="off"
          value={values.make}
          onChange={(event) =>
            setValues({ ...values, make: event.target.value })
          }
          placeholder="Volkswagen"
        />
        <InputField
          label="Modell"
          required
          autoComplete="off"
          value={values.model}
          onChange={(event) =>
            setValues({ ...values, model: event.target.value })
          }
          placeholder="Golf"
        />
        <InputField
          label="Baujahr"
          required
          type="number"
          min={1886}
          max={new Date().getFullYear() + 1}
          step={1}
          value={values.year}
          onChange={(event) =>
            setValues({ ...values, year: event.target.value })
          }
        />
        {!car && (
          <InputField
            label="Kilometerstand (km)"
            required
            type="number"
            min={0}
            step={1}
            value={values.mileage}
            onChange={(event) =>
              setValues({ ...values, mileage: event.target.value })
            }
          />
        )}
        <InputField
          label="Kennzeichen (optional)"
          autoComplete="off"
          value={values.licensePlate}
          onChange={(event) =>
            setValues({ ...values, licensePlate: event.target.value })
          }
          placeholder="B CC 2026"
        />
        <div className="col-span-2">
          <InputField
            label="Fahrgestellnummer / VIN (optional)"
            autoComplete="off"
            value={values.vin}
            onChange={(event) =>
              setValues({ ...values, vin: event.target.value })
            }
          />
        </div>
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Versicherung (optional)</h3>
        <InputField
          label="Versicherer"
          value={values.provider}
          onChange={(event) =>
            setValues({ ...values, provider: event.target.value })
          }
          placeholder="Allianz"
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Versicherungsnummer"
            value={values.policyNumber}
            onChange={(event) =>
              setValues({ ...values, policyNumber: event.target.value })
            }
          />
          <InputField
            label="Ablaufdatum"
            type="date"
            value={values.expiryDate}
            onChange={(event) =>
              setValues({ ...values, expiryDate: event.target.value })
            }
          />
        </div>
        {car?.insurance && (
          <p className="text-xs text-muted-foreground">
            Leere alle Versicherungsfelder, um die Versicherung zu entfernen.
          </p>
        )}
      </div>
    </FormDialog>
  );
}

function MileageForm({ car, actions, onClose }: CarFormProps) {
  const [mileage, setMileage] = useState(String(car.mileage));
  return (
    <FormDialog
      title="Kilometerstand aktualisieren"
      description={`${car.make} ${car.model} · Aktuell ${formatNumber(car.mileage)} km`}
      successMessage="Kilometerstand gespeichert."
      validate={() => integerError(mileage, "Kilometerstand", car.mileage)}
      onSave={async () => {
        await actions.update({ id: car._id, mileage: numberValue(mileage) });
      }}
      onClose={onClose}
    >
      <InputField
        label="Neuer Kilometerstand (km)"
        required
        type="number"
        min={car.mileage}
        step={1}
        value={mileage}
        onChange={(event) => setMileage(event.target.value)}
      />
    </FormDialog>
  );
}

function TuvForm({ car, actions, onClose }: CarFormProps) {
  const [date, setDate] = useState(todayDate());
  return (
    <FormDialog
      title="TÜV eintragen"
      description={`${car.make} ${car.model} · Nächster TÜV nach zwei Jahren.`}
      successMessage="TÜV gespeichert."
      validate={() => completedDateError(date)}
      onSave={async () => {
        await actions.saveTuv({ carId: car._id, date });
      }}
      onClose={onClose}
    >
      <InputField
        label="Datum der Untersuchung"
        required
        type="date"
        max={todayDate()}
        value={date}
        onChange={(event) => setDate(event.target.value)}
        hint={
          car.tuv.lastAppointmentDate
            ? `Zuletzt: ${formatDate(car.tuv.lastAppointmentDate)}`
            : undefined
        }
      />
      {validDate(date) && (
        <p className="text-sm text-muted-foreground">
          Nächster TÜV:{" "}
          <span className="text-foreground">
            {formatDate(calculateNextTUVDate(date))}
          </span>
        </p>
      )}
    </FormDialog>
  );
}

function InspectionForm({ car, actions, onClose }: CarFormProps) {
  const [date, setDate] = useState(todayDate());
  const [mileage, setMileage] = useState(String(car.mileage));
  const [intervalYears, setIntervalYears] = useState(
    String(car.inspection.intervalYears),
  );
  const [intervalKm, setIntervalKm] = useState(
    String(
      car.inspection.intervalKm === AB_ZIELE_INTERVAL_KM
        ? 15000
        : car.inspection.intervalKm,
    ),
  );
  const [conditionBased, setConditionBased] = useState(
    car.inspection.intervalKm === AB_ZIELE_INTERVAL_KM,
  );
  const nextDate =
    validDate(date) &&
    Number.isSafeInteger(numberValue(intervalYears)) &&
    numberValue(intervalYears) >= 1 &&
    numberValue(intervalYears) <= 10
      ? calculateNextInspectionDateByYear(date, numberValue(intervalYears))
      : null;

  function validate() {
    return (
      completedDateError(date) ||
      integerError(mileage, "Kilometerstand", 0, car.mileage) ||
      integerError(intervalYears, "Jahresintervall", 1, 10) ||
      (!conditionBased
        ? integerError(intervalKm, "Kilometerintervall", 1)
        : undefined) ||
      (!conditionBased && numberValue(intervalKm) === AB_ZIELE_INTERVAL_KM
        ? "Wähle für AB Ziele 95 die Option „Nach Zustand“."
        : undefined)
    );
  }

  return (
    <FormDialog
      title="Inspektion eintragen"
      description={`${car.make} ${car.model} · Dokumentiere den abgeschlossenen Service.`}
      successMessage="Inspektion gespeichert."
      validate={validate}
      onSave={async () => {
        await actions.saveInspection({
          carId: car._id,
          date,
          mileage: numberValue(mileage),
          intervalYears: numberValue(intervalYears),
          intervalKm: conditionBased
            ? AB_ZIELE_INTERVAL_KM
            : numberValue(intervalKm),
        });
      }}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Datum der Inspektion"
          required
          type="date"
          max={todayDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <InputField
          label="Kilometerstand (km)"
          required
          type="number"
          min={0}
          max={car.mileage}
          step={1}
          value={mileage}
          onChange={(event) => setMileage(event.target.value)}
          hint={`Bis ${formatNumber(car.mileage)} km. Bei höherem Stand aktualisiere zuerst den Kilometerstand.`}
        />
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Serviceintervall</h3>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Alle wie viele Jahre?"
            required
            type="number"
            min={1}
            max={10}
            step={1}
            value={intervalYears}
            onChange={(event) => setIntervalYears(event.target.value)}
          />
          <SelectField
            label="Zusätzlich fällig"
            value={conditionBased ? "condition" : "distance"}
            onChange={(event) =>
              setConditionBased(event.target.value === "condition")
            }
          >
            <option value="distance">Nach Kilometern</option>
            <option value="condition">Nach Zustand (AB Ziele 95)</option>
          </SelectField>
        </div>
        {!conditionBased && (
          <InputField
            label="Alle wie viele Kilometer?"
            required
            type="number"
            min={1}
            step={1}
            value={intervalKm}
            onChange={(event) => setIntervalKm(event.target.value)}
          />
        )}
        {conditionBased && (
          <p className="text-xs text-muted-foreground">
            Bei AB Ziele 95 entscheidet der Fahrzeugzustand. Es gibt kein festes
            Kilometerintervall.
          </p>
        )}
      </div>
      {nextDate && (
        <p className="text-sm text-muted-foreground">
          Spätestens{" "}
          <span className="text-foreground">{formatDate(nextDate)}</span>
          {!conditionBased &&
            Number.isSafeInteger(numberValue(mileage)) &&
            Number.isSafeInteger(numberValue(intervalKm)) &&
            ` oder bei ${formatNumber(numberValue(mileage) + numberValue(intervalKm))} km`}
          .
        </p>
      )}
    </FormDialog>
  );
}

function AddTireForm({ car, actions, onClose }: CarFormProps) {
  const [type, setType] = useState<TireType>("summer");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("0");
  return (
    <FormDialog
      title="Reifensatz hinzufügen"
      description={`${car.make} ${car.model} · Neue oder bereits gefahrene Reifen.`}
      successMessage="Reifensatz hinzugefügt."
      validate={() => integerError(mileage, "Laufleistung")}
      onSave={async () => {
        await actions.addTire({
          carId: car._id,
          type,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          currentMileage: numberValue(mileage),
        });
      }}
      onClose={onClose}
    >
      <SelectField
        label="Reifentyp"
        value={type}
        onChange={(event) => {
          const value = event.target.value;
          if (
            value === "summer" ||
            value === "winter" ||
            value === "all-season"
          )
            setType(value);
        }}
      >
        <option value="summer">Sommerreifen</option>
        <option value="winter">Winterreifen</option>
        <option value="all-season">Ganzjahresreifen</option>
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Hersteller (optional)"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="Continental"
        />
        <InputField
          label="Modell (optional)"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="PremiumContact"
        />
      </div>
      <InputField
        label="Bisherige Laufleistung (km)"
        required
        type="number"
        min={0}
        step={1}
        value={mileage}
        onChange={(event) => setMileage(event.target.value)}
        hint="Für neue Reifen: 0 km. Montieren kannst du den Satz danach unter Reifenwechsel."
      />
    </FormDialog>
  );
}

function ChangeTiresForm({ car, actions, onClose }: CarFormProps) {
  const [tireId, setTireId] = useState("");
  const [mileage, setMileage] = useState(String(car.mileage));
  const [date, setDate] = useState(todayDate());
  const availableTires = car.tires.filter(
    (tire) => !tire.archived && tire.id !== car.currentTireId,
  );
  const mountedTire = car.tires.find((tire) => tire.id === car.currentTireId);
  const unmountValue = "__unmount__";

  function validate() {
    if (
      tireId === unmountValue
        ? !mountedTire
        : !availableTires.some((tire) => tire.id === tireId)
    )
      return "Bitte wähle einen Reifensatz oder „Nur demontieren“.";
    return (
      completedDateError(date) ||
      integerError(mileage, "Kilometerstand", car.mileage)
    );
  }

  return (
    <FormDialog
      title="Reifenwechsel eintragen"
      description={`${car.make} ${car.model}${mountedTire ? ` · Aktuell: ${tireLabels[mountedTire.type]}` : " · Aktuell kein Reifensatz montiert."}`}
      successMessage="Reifenwechsel gespeichert."
      validate={validate}
      onSave={async () => {
        await actions.changeTires({
          carId: car._id,
          tireId: tireId === unmountValue ? null : tireId,
          mileage: numberValue(mileage),
          date,
        });
      }}
      onClose={onClose}
    >
      <SelectField
        label="Reifensatz montieren"
        required
        value={tireId}
        onChange={(event) => setTireId(event.target.value)}
      >
        <option value="" disabled>
          Reifensatz wählen
        </option>
        {availableTires.map((tire) => (
          <option key={tire.id} value={tire.id}>
            {tireLabels[tire.type]}
            {tire.brand || tire.model
              ? ` · ${[tire.brand, tire.model].filter(Boolean).join(" ")}`
              : ""}{" "}
            · {formatNumber(tire.currentMileage)} km
          </option>
        ))}
        {mountedTire && <option value={unmountValue}>Nur demontieren</option>}
      </SelectField>
      {!availableTires.length && (
        <p className="text-xs text-muted-foreground">
          Füge einen weiteren Reifensatz hinzu, um Reifen zu montieren.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Datum des Wechsels"
          required
          type="date"
          max={todayDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <InputField
          label="Kilometerstand (km)"
          required
          type="number"
          min={car.mileage}
          step={1}
          value={mileage}
          onChange={(event) => setMileage(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Die seit dem letzten Wechsel gefahrenen Kilometer werden den montierten
        Reifen gutgeschrieben.
      </p>
    </FormDialog>
  );
}

function FuelForm({
  car,
  actions,
  onClose,
  entry,
}: CarFormProps & { entry?: FuelEntry }) {
  const [date, setDate] = useState(
    entry ? toDateInput(entry.date) : todayDate(),
  );
  const [mileage, setMileage] = useState(String(entry?.mileage ?? car.mileage));
  const [liters, setLiters] = useState(entry ? String(entry.liters) : "");
  const [pricePerLiter, setPricePerLiter] = useState(
    entry?.pricePerLiter === undefined ? "" : String(entry.pricePerLiter),
  );
  const [totalCost, setTotalCost] = useState(
    entry?.totalCost === undefined ? "" : String(entry.totalCost),
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const priceMatchesReceipt =
    entry?.pricePerLiter !== undefined &&
    entry.totalCost !== undefined &&
    Math.abs(
      roundCurrency(entry.totalCost) -
        roundCurrency(entry.pricePerLiter * entry.liters),
    ) <= 0.010001;
  const [priceMode, setPriceMode] = useState(
    entry?.totalCost !== undefined && !priceMatchesReceipt
      ? "total"
      : "per-liter",
  );
  const enteredPrice = priceMode === "total" ? totalCost : pricePerLiter;
  const retainedReceiptTotal =
    priceMode === "per-liter" &&
    priceMatchesReceipt &&
    entry?.pricePerLiter === numberValue(pricePerLiter) &&
    entry?.liters === numberValue(liters)
      ? entry.totalCost
      : undefined;
  const previewTotal =
    priceMode === "total"
      ? numberValue(totalCost)
      : (retainedReceiptTotal ??
        numberValue(liters) * numberValue(pricePerLiter));

  function validate() {
    const unchangedLegacyMileage =
      entry?.mileage === numberValue(mileage) &&
      Number.isFinite(entry.mileage) &&
      entry.mileage >= 0;
    const error =
      completedDateError(date) ||
      (unchangedLegacyMileage
        ? undefined
        : integerError(mileage, "Kilometerstand"));
    if (error) return error;
    if (!Number.isFinite(numberValue(liters)) || numberValue(liters) <= 0)
      return "Bitte gib eine Literzahl größer als 0 ein.";
    if (
      enteredPrice.trim() &&
      (!Number.isFinite(numberValue(enteredPrice)) ||
        numberValue(enteredPrice) < 0)
    )
      return "Bitte gib einen gültigen Preis ab 0 € ein oder lass das Preisfeld leer.";
  }

  return (
    <FormDialog
      title={entry ? "Tankeintrag bearbeiten" : "Tanken eintragen"}
      description={`${car.make} ${car.model} · Auch frühere Tankstopps kannst du nachtragen.`}
      successMessage="Tankeintrag gespeichert."
      validate={validate}
      onSave={async () => {
        await actions.saveFuelEntry({
          carId: car._id,
          entryId: entry?.id,
          date,
          mileage: numberValue(mileage),
          liters: numberValue(liters),
          ...(enteredPrice.trim()
            ? priceMode === "total"
              ? { totalCost: numberValue(totalCost) }
              : {
                  pricePerLiter: numberValue(pricePerLiter),
                  ...(retainedReceiptTotal !== undefined
                    ? { totalCost: retainedReceiptTotal }
                    : {}),
                }
            : {}),
          notes: notes.trim() || undefined,
        });
      }}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Datum"
          required
          type="date"
          max={todayDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <InputField
          label="Kilometerstand (km)"
          required
          type="number"
          min={0}
          step={1}
          value={mileage}
          onChange={(event) => setMileage(event.target.value)}
        />
        <InputField
          label="Getankte Liter"
          required
          type="number"
          min={0.001}
          step="any"
          value={liters}
          onChange={(event) => setLiters(event.target.value)}
          placeholder="42,5"
        />
        <SelectField
          label="Preisangabe (optional)"
          value={priceMode}
          onChange={(event) => setPriceMode(event.target.value)}
        >
          <option value="per-liter">Preis pro Liter</option>
          <option value="total">Gesamtpreis</option>
        </SelectField>
      </div>
      {priceMode === "total" ? (
        <InputField
          label="Gesamtpreis (€)"
          type="number"
          min={0}
          step="0.01"
          value={totalCost}
          onChange={(event) => setTotalCost(event.target.value)}
          placeholder="Optional"
        />
      ) : (
        <InputField
          label="Preis pro Liter (€)"
          type="number"
          min={0}
          step="0.001"
          value={pricePerLiter}
          onChange={(event) => setPricePerLiter(event.target.value)}
          placeholder="Optional"
        />
      )}
      {enteredPrice.trim() &&
        Number.isFinite(previewTotal) &&
        previewTotal >= 0 && (
          <p className="text-sm text-muted-foreground">
            Gesamtkosten:{" "}
            <span className="text-foreground">
              {formatCurrency(previewTotal)}
            </span>
          </p>
        )}
      <InputField
        label="Notiz (optional)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Tankstelle, Fahrt oder sonstige Details"
      />
    </FormDialog>
  );
}
