"use client";

import React, { useId } from "react";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "default" | "success" | "warning" | "danger";
  label?: string;
  sublabel?: string;
}

export default function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "default",
  label,
  sublabel,
}: CircularProgressProps) {
  const gradientId = useId().replace(/:/g, "");
  
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const colorConfig = {
    default: { 
      from: "hsl(var(--primary, 221 83% 53%))", 
      to: "hsl(var(--primary-light, 217 91% 60%))", 
      shadow: "rgba(var(--primary-rgb, 59, 130, 246), 0.4)" 
    },
    success: { 
      from: "hsl(var(--success, 142 76% 36%))", 
      to: "hsl(var(--success-light, 142 71% 45%))", 
      shadow: "rgba(var(--success-rgb, 34, 197, 94), 0.4)" 
    },
    warning: { 
      from: "hsl(var(--warning, 38 92% 50%))", 
      to: "hsl(var(--warning-light, 48 96% 53%))", 
      shadow: "rgba(var(--warning-rgb, 234, 179, 8), 0.4)" 
    },
    danger: { 
      from: "hsl(var(--danger, 0 84% 60%))", 
      to: "hsl(var(--danger-light, 0 91% 71%))", 
      shadow: "rgba(var(--danger-rgb, 239, 68, 68), 0.4)" 
    },
  };

  const { from, to, shadow } = colorConfig[color];

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedProgress}
        role="progressbar"
      >
        <defs>
          <linearGradient id={`gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={`url(#gradient-${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${shadow})`,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
        {label && (
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium mt-0.5 truncate max-w-full">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
