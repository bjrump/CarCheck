'use client';

interface ProgressBarProps {
  progress: number | null;
  label: string;
  value?: string;
  color?: 'default' | 'warning' | 'danger' | 'success';
}

export default function ProgressBar({ progress, label, value, color = 'default' }: ProgressBarProps) {
  if (progress === null) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">{label}</span>
          <span className="text-muted-foreground font-mono">-</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted/50" />
      </div>
    );
  }

  const clampedProgress = Math.max(0, Math.min(100, progress));

  const isDanger = clampedProgress >= 100;
  const isWarning = clampedProgress >= 80 && !isDanger;
  
  const gradients = {
    default: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  };

  let activeGradient = gradients[color];
  
  if (isDanger) {
    activeGradient = gradients.danger;
  } else if (isWarning) {
    activeGradient = gradients.warning;
  }

  const showShimmer = clampedProgress >= 80;

  return (
    <div className="space-y-1.5 group">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {label}
        </span>
        <span className={`font-mono font-semibold transition-colors ${
          isDanger ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-foreground'
        }`}>
          {value || `${clampedProgress.toFixed(0)}%`}
        </span>
      </div>
      
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50 ring-1 ring-white/5">
        <div
          className={`relative h-full transition-all duration-500 ease-out rounded-full ${activeGradient}`}
          style={{ width: `${clampedProgress}%` }}
        >
          {showShimmer && (
            <div className="absolute inset-0 animate-shimmer" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
