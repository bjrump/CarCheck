export type TireType = "summer" | "winter" | "all-season";

export interface Tire {
  id: string;
  type: TireType;
  brand?: string;
  model?: string;
  currentMileage: number;
  archived: boolean;
}

export interface TireChangeEvent {
  id: string;
  date: string;
  carMileage: number;
  tireId: string;
  tireMileage: number;
  changeType: "mount" | "unmount";
}

export interface FuelEntry {
  id: string;
  date: string; // ISO date string
  mileage: number; // Kilometerstand beim Tanken
  liters: number; // Getankte Liter
  kmDriven?: number; // Gefahrene KM seit letztem Tanken (berechnet)
  consumption?: number; // Verbrauch in L/100km (berechnet)
  pricePerLiter?: number; // Preis pro Liter (optional)
  totalCost?: number; // Gesamtkosten (optional)
  notes?: string; // Notizen (optional)
}

export interface TUV {
  lastAppointmentDate: string | null;
  nextAppointmentDate: string | null;
  completed: boolean;
}

export interface Inspection {
  lastInspectionDate: string | null;
  lastInspectionMileage: number | null;
  nextInspectionDateByYear: string | null;
  nextInspectionDateByKm: string | null;
  nextInspectionDate: string | null;
  intervalYears: number;
  intervalKm: number;
  completed: boolean;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  expiryDate: string;
}

export type EventType = 
  | 'mileage_update'
  | 'tuv_update'
  | 'inspection_update'
  | 'tire_change'
  | 'car_created'
  | 'car_updated'
  | 'insurance_update'
  | 'fuel_entry';

export interface CarEvent {
  id: string;
  type: EventType;
  date: string; // ISO date string
  description: string; // Human-readable description
  metadata?: Record<string, unknown>; // Additional data (e.g. old/new mileage, tire info, etc.)
}

export interface Car {
  _id: string;
  _creationTime: number;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  mileage: number;
  insurance: Insurance | null;
  tuv: TUV;
  inspection: Inspection;
  tires: Tire[];
  tireChangeEvents: TireChangeEvent[];
  currentTireId: string | null;
  fuelEntries?: FuelEntry[];
  eventLog?: CarEvent[];
}
