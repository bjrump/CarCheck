export type TireType = 'summer' | 'winter' | 'all-season';

export interface Tire {
  id: string;
  type: TireType;
  brand?: string;
  model?: string;
  currentMileage: number; // Aktueller KM-Stand der Reifen (gefahrene Kilometer)
  archived: boolean; // Archiviert (nicht wieder aktivierbar)
}

export interface TireChangeEvent {
  id: string;
  date: string; // ISO date string
  carMileage: number; // Auto-KM-Stand beim Wechsel
  tireId: string; // ID des montierten/abmontierten Reifens
  tireMileage: number; // Reifen-KM-Stand beim Wechsel
  changeType: 'mount' | 'unmount'; // Montiert oder abmontiert
}

export interface TUV {
  lastAppointmentDate: string | null; // ISO date string
  nextAppointmentDate: string | null; // ISO date string - automatisch 2 Jahre nach letztem Termin
  completed: boolean;
}

export interface Inspection {
  lastInspectionDate: string | null; // ISO date string
  lastInspectionMileage: number | null;
  nextInspectionDateByYear: string | null; // ISO date string - basierend auf Jahren
  nextInspectionDateByKm: string | null; // ISO date string - basierend auf KM
  nextInspectionDate: string | null; // ISO date string - das frühere Datum
  intervalYears: number; // z.B. 1 Jahr
  intervalKm: number; // z.B. 15000 km
  completed: boolean;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  expiryDate: string; // ISO date string
}

export interface Car {
  id: string;
  make: string; // Marke
  model: string; // Modell
  year: number;
  vin?: string;
  licensePlate?: string; // Kennzeichen
  mileage: number; // Kilometerstand
  insurance: Insurance | null;
  tuv: TUV;
  inspection: Inspection;
  tires: Tire[];
  tireChangeEvents: TireChangeEvent[];
  currentTireId: string | null; // ID des aktuell montierten Reifens
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

