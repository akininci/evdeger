"use client";

import { formatTL } from "@/lib/api";

interface ConfidenceBarProps {
  low: number;
  average: number;
  high: number;
  accentColor?: "blue" | "green";
}

export function ConfidenceBar({ low, average, high, accentColor = "blue" }: ConfidenceBarProps) {
  // Position the average marker as a percentage between low and high
  const range = high - low;
  const avgPosition = range > 0 ? ((average - low) / range) * 100 : 50;

  const barBg = accentColor === "green"
    ? "from-emerald-200 via-emerald-400 to-emerald-600"
    : "from-blue-200 via-blue-400 to-blue-700";

  const markerColor = accentColor === "green" ? "bg-emerald-600" : "bg-brand-navy";

  return (
    <div className="w-full space-y-2">
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Düşük</span>
        <span>Ortalama</span>
        <span>Yüksek</span>
      </div>

      {/* Bar */}
      <div className="relative">
        <div className={`h-3 rounded-full bg-gradient-to-r ${barBg} opacity-80`} />
        {/* Average marker */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${avgPosition}%` }}
        >
          <div className={`w-1 h-3 ${markerColor} rounded-full`} />
          <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent ${accentColor === "green" ? "border-t-emerald-600" : "border-t-brand-navy"} mx-auto`} />
        </div>
      </div>

      {/* Values */}
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">{formatTL(low)}</span>
        <span className={accentColor === "green" ? "text-emerald-600" : "text-brand-navy"}>
          {formatTL(average)}
        </span>
        <span className="text-muted-foreground">{formatTL(high)}</span>
      </div>
    </div>
  );
}
