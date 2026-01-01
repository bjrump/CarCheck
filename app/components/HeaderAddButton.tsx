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
      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-accent px-4 py-2 text-accent-foreground font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_34px_rgba(0,0,0,0.22)]"
    >
      <span aria-hidden>＋</span>
      Neues Fahrzeug
    </button>
  );
}
