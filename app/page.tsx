"use client";

import CarCard from "@/app/components/CarCard";
import CarForm from "@/app/components/CarForm";
import EventLogSection from "@/app/components/EventLogSection";
import FuelAnalytics from "@/app/components/FuelAnalytics";
import FuelSection from "@/app/components/FuelSection";
import InspectionSection from "@/app/components/InspectionSection";
import TireSection from "@/app/components/TireSection";
import TUVSection from "@/app/components/TUVSection";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import { Car } from "@/app/lib/types";
import {
  calculateNextTireChangeDate,
  formatDate,
  formatNumber,
  getMaintenanceStatus,
} from "@/app/lib/utils";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

type ViewMode = "dashboard" | "add-car" | "edit-car" | "car-detail";
type DetailTab = "overview" | "tuv" | "inspection" | "tires" | "fuel" | "history";

/**
 * LandingPage Component
 *
 * The public-facing landing page shown to unauthenticated users.
 * Features a hero section and a list of application features.
 */
function LandingPage() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      title: "Fahrzeugverwaltung",
      description: "Alle Fahrzeuge zentral verwalten mit Kilometerstand, VIN und Kennzeichen.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
      title: "TÜV-Termine",
      description: "Automatische Berechnung und Erinnerungen für den 2-Jahres-Zyklus.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      ),
      title: "Inspektionen",
      description: "Dual-Tracking nach Zeit und Kilometerstand für optimale Wartung.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Reifenverwaltung",
      description: "Sommer- und Winterreifen mit automatischer Wechselerinnerung.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      ),
      title: "Tankbuch",
      description: "Verbrauchsanalyse mit detaillierten Statistiken und Kosten.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: "Dashboard",
      description: "Übersichtliche Ansicht aller anstehenden Termine auf einen Blick.",
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <section className="flex-1 flex flex-col justify-center text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mx-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          Kostenlos starten
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Ihre Fahrzeuge.{" "}
          <span className="gradient-text">Perfekt organisiert.</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          CarCheck ist Ihre zentrale Anlaufstelle für TÜV-Termine, Inspektionen, 
          Reifenverwaltung und Tankprotokoll — alles in einer modernen App.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <SignInButton mode="modal">
            <button className="btn btn-primary text-lg px-8 py-3">
              Jetzt kostenlos starten
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </SignInButton>
        </div>
      </section>

      <section className="flex-shrink-0 pb-6 space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Features</p>
          <h2 className="text-2xl font-bold mt-1">Was CarCheck kann</h2>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 pb-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="glass p-5 w-full sm:w-[280px] max-w-[280px] space-y-3 group hover:border-accent/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="glass p-6 text-center space-y-4">
          <h2 className="text-xl font-bold">Bereit loszulegen?</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Melden Sie sich jetzt an und verpassen Sie nie wieder einen wichtigen Termin.
          </p>
          <SignUpButton mode="modal">
            <button className="btn btn-primary px-6 py-2">
              Kostenlos registrieren
            </button>
          </SignUpButton>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="glass p-5 animate-scale-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dashboard Component
 *
 * The main authenticated view of the application.
 * Displays the list of user's cars and summary statistics.
 * Handles car selection, creation, and deletion.
 */
function Dashboard() {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const carsData = useQuery(api.cars.list);
  const cars = (carsData ?? []) as Car[];
  const deleteCar = useMutation(api.cars.remove);
  const updateCar = useMutation(api.cars.update);
  
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isUpdatingMileage, setIsUpdatingMileage] = useState(false);
  const [showMileageInput, setShowMileageInput] = useState(false);
  const [newMileage, setNewMileage] = useState("");

  const isLoading = carsData === undefined;
  const selectedCar = selectedCarId ? cars.find(c => c._id === selectedCarId) ?? null : null;

  const handleSelectCar = (car: Car) => {
    setSelectedCarId(car._id);
    setActiveTab("overview");
    setViewMode("car-detail");
  };

  const handleBackToDashboard = () => {
    setSelectedCarId(null);
    setViewMode("dashboard");
    setShowMileageInput(false);
    setNewMileage("");
  };

  const handleCarCreated = () => {
    setViewMode("dashboard");
    toast.success("Fahrzeug erfolgreich hinzugefügt");
  };

  const handleCarUpdated = () => {
    setViewMode("car-detail");
    toast.success("Fahrzeug erfolgreich aktualisiert");
  };

  const handleCarDelete = async (carId: string) => {
    const confirmed = await confirm({
      title: "Fahrzeug löschen",
      message: "Möchten Sie dieses Fahrzeug wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      confirmText: "Löschen",
      cancelText: "Abbrechen",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCar({ id: carId as Id<"cars"> });
      if (selectedCar?._id === carId) {
        handleBackToDashboard();
      }
      toast.success("Fahrzeug gelöscht");
    } catch {
      toast.error("Fehler beim Löschen des Fahrzeugs");
    }
  };

  const handleMileageUpdate = async () => {
    if (!selectedCar || !newMileage || isNaN(parseInt(newMileage, 10))) {
      toast.warning("Bitte geben Sie einen gültigen Kilometerstand ein");
      return;
    }

    setIsUpdatingMileage(true);
    try {
      await updateCar({
        id: selectedCar._id as Id<"cars">,
        mileage: parseInt(newMileage, 10),
      });
      setShowMileageInput(false);
      setNewMileage("");
      toast.success("Kilometerstand aktualisiert");
    } catch {
      toast.error("Fehler beim Aktualisieren des Kilometerstands");
    } finally {
      setIsUpdatingMileage(false);
    }
  };

  const overdue = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId ? car.tires?.find((t) => t.id === car.currentTireId) : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange ? getMaintenanceStatus(tireChange.date) : "none";
    return tuv === "overdue" || insp === "overdue" || tireChangeStatus === "overdue";
  }).length;

  const upcomingSoon = cars.filter((car) => {
    const tuv = getMaintenanceStatus(car.tuv.nextAppointmentDate);
    const insp = getMaintenanceStatus(car.inspection.nextInspectionDate);
    const currentTire = car.currentTireId ? car.tires?.find((t) => t.id === car.currentTireId) : null;
    const tireChange = calculateNextTireChangeDate(currentTire?.type || null);
    const tireChangeStatus = tireChange ? getMaintenanceStatus(tireChange.date) : "none";
    return tuv === "upcoming" || insp === "upcoming" || tireChangeStatus === "upcoming";
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="glass px-8 py-6 flex items-center gap-4">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Laden...</span>
        </div>
      </div>
    );
  }

  if (viewMode === "add-car") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={handleBackToDashboard}
          className="btn btn-outline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück
        </button>
        <CarForm onCreated={handleCarCreated} />
      </div>
    );
  }

  if (viewMode === "edit-car" && selectedCar) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => setViewMode("car-detail")}
          className="btn btn-outline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück
        </button>
        <CarForm car={selectedCar} onUpdated={handleCarUpdated} onCancel={() => setViewMode("car-detail")} />
      </div>
    );
  }

  if (viewMode === "car-detail" && selectedCar) {
    const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
      { id: "overview", label: "Übersicht", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
      { id: "tuv", label: "TÜV", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg> },
      { id: "inspection", label: "Inspektion", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg> },
      { id: "tires", label: "Reifen", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg> },
      { id: "fuel", label: "Tanken", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg> },
      { id: "history", label: "Historie", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ];

    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex-shrink-0 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button onClick={handleBackToDashboard} className="btn btn-outline self-start">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zurück
            </button>
            
            <div className="flex gap-2">
              <button onClick={() => setViewMode("edit-car")} className="btn btn-secondary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Bearbeiten
              </button>
              <button onClick={() => handleCarDelete(selectedCar._id)} className="btn btn-danger">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Löschen
              </button>
            </div>
          </div>

          <div className="glass p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{selectedCar.year}</p>
                <h1 className="text-2xl md:text-3xl font-bold">{selectedCar.make} {selectedCar.model}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {selectedCar.licensePlate && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M4 7l4-4h8l4 4" />
                      </svg>
                      {selectedCar.licensePlate}
                    </span>
                  )}
                  {selectedCar.vin && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      VIN: {selectedCar.vin}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!showMileageInput ? (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-accent">{formatNumber(selectedCar.mileage)} km</p>
                    <button
                      onClick={() => { setNewMileage(selectedCar.mileage.toString()); setShowMileageInput(true); }}
                      className="text-xs text-muted-foreground hover:text-accent transition-colors"
                    >
                      Aktualisieren
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newMileage}
                      onChange={(e) => setNewMileage(e.target.value)}
                      className="input w-32"
                      placeholder="km"
                      min="0"
                    />
                    <button onClick={handleMileageUpdate} disabled={isUpdatingMileage} className="btn btn-success">
                      {isUpdatingMileage ? "..." : "✓"}
                    </button>
                    <button onClick={() => { setShowMileageInput(false); setNewMileage(""); }} className="btn btn-secondary">
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 pt-2 pb-4 overflow-y-auto">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TUVSection car={selectedCar} onUpdate={() => toast.success("TÜV-Daten aktualisiert")} />
              <InspectionSection car={selectedCar} onUpdate={() => toast.success("Inspektionsdaten aktualisiert")} />
              <TireSection car={selectedCar} onUpdate={() => toast.success("Reifendaten aktualisiert")} />
              <FuelSection car={selectedCar} onUpdate={() => toast.success("Tankdaten aktualisiert")} />
              {selectedCar.insurance && (
                <div className="glass p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Versicherung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Versicherer:</span>
                      <span className="ml-2 font-medium">{selectedCar.insurance.provider}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Versicherungsnummer:</span>
                      <span className="ml-2 font-medium">{selectedCar.insurance.policyNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ablaufdatum:</span>
                      <span className="ml-2 font-medium">{formatDate(selectedCar.insurance.expiryDate)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "tuv" && <TUVSection car={selectedCar} onUpdate={() => toast.success("TÜV-Daten aktualisiert")} />}
          {activeTab === "inspection" && <InspectionSection car={selectedCar} onUpdate={() => toast.success("Inspektionsdaten aktualisiert")} />}
          {activeTab === "tires" && <TireSection car={selectedCar} onUpdate={() => toast.success("Reifendaten aktualisiert")} />}
          {activeTab === "fuel" && (
            <div className="space-y-6">
              <FuelSection car={selectedCar} onUpdate={() => toast.success("Tankdaten aktualisiert")} />
              {selectedCar.fuelEntries && selectedCar.fuelEntries.length > 1 && (
                <FuelAnalytics fuelEntries={selectedCar.fuelEntries} />
              )}
            </div>
          )}
          {activeTab === "history" && <EventLogSection car={selectedCar} />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-bold">Meine Fahrzeuge</h1>
          </div>
          <button onClick={() => setViewMode("add-car")} className="btn btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Fahrzeug hinzufügen
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Fahrzeuge"
            value={cars.length}
            hint="in deiner Garage"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
          />
          <StatCard
            label="Anstehend"
            value={upcomingSoon}
            hint="in den nächsten 30 Tagen"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Überfällig"
            value={overdue}
            hint="bitte zeitnah planen"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {cars.length === 0 ? (
          <div className="glass text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Noch keine Fahrzeuge</h3>
            <p className="text-muted-foreground">Fügen Sie Ihr erstes Fahrzeug hinzu, um loszulegen.</p>
            <button onClick={() => setViewMode("add-car")} className="btn btn-primary">
              Erstes Fahrzeug hinzufügen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-4">
            {cars.map((car, index) => (
              <div key={car._id} className={`animate-slide-up stagger-${Math.min(index + 1, 5)}`}>
                <CarCard car={car} onSelect={handleSelectCar} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}
