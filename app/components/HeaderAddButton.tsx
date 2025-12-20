'use client';

export default function HeaderAddButton() {
  const handleAddCar = () => {
    // Trigger a custom event that the page can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('addCar'));
    }
  };

  return (
    <button
      onClick={handleAddCar}
      className="rounded-xl bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-soft transition hover:-translate-y-[1px] hover:shadow-lg"
    >
      Neues Fahrzeug
    </button>
  );
}
