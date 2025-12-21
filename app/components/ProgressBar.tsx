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
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">-</span>
        </div>
      </div>
    );
  }

  const clampedProgress = Math.max(0, Math.min(100, progress));

  const colorClasses = {
    default: 'bg-accent',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    success: 'bg-green-500',
  };

  const bgColorClasses = {
    default: 'bg-accent/20',
    warning: 'bg-yellow-500/20',
    danger: 'bg-red-500/20',
    success: 'bg-green-500/20',
  };

  const barColor = clampedProgress >= 100 ? colorClasses.danger : clampedProgress >= 80 ? colorClasses.warning : colorClasses[color];
  const bgColor = clampedProgress >= 100 ? bgColorClasses.danger : clampedProgress >= 80 ? bgColorClasses.warning : bgColorClasses[color];

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value || `${clampedProgress.toFixed(1)}%`}
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${bgColor}`}>
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}


